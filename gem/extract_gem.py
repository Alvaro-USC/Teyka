"""
Proyecto GEM — ETL Pipeline
Combines Fitbit RMSSD + GLOBEM screen/steps → gem_data.json
Computes IS (Índice de Saturación) = 0.60 × StressScore + 0.40 × BehaviorScore
Classifies sessions: Productive (green) vs Entertainment (red)
"""
import pandas as pd
import numpy as np
import json

# ═══════════════════════════════════════════════════════════════
# 1. LOAD FITBIT DATA (RMSSD + Sedentary)
# ═══════════════════════════════════════════════════════════════

print("Loading Fitbit data...")
df_fitbit = pd.read_csv("../dataset_final_pitch.csv")
print(f"  Fitbit users: {df_fitbit.Id.nunique()}, rows: {len(df_fitbit)}")

# Fitbit RMSSD per user (already computed from heartrate_seconds)
fitbit_users = []
for _, row in df_fitbit.iterrows():
    fitbit_users.append({
        "id": str(int(row["Id"])),
        "rmssd": round(row["RMSSD_ms"], 2),
        "sedentary_min": round(row["SedentaryMinutes"], 1),
        "risk": row["Perfil_Riesgo"],
    })

# Compute population baseline RMSSD
baseline_rmssd = df_fitbit["RMSSD_ms"].mean()
print(f"  Population RMSSD baseline: {baseline_rmssd:.2f} ms")

# ═══════════════════════════════════════════════════════════════
# 2. LOAD GLOBEM DATA (screen + steps)
# ═══════════════════════════════════════════════════════════════

print("\nLoading GLOBEM data...")
dfs_screen = []
dfs_steps = []

SCREEN_METRICS = [
    "sumdurationunlock", "countepisodeunlock", "avgdurationunlock",
    "maxdurationunlock", "mindurationunlock", "stddurationunlock",
]
STEPS_METRICS = ["sumsteps", "sumdurationsedentarybout", "sumdurationactivebout"]
TIME_SEGMENTS = ["morning", "afternoon", "evening", "night", "allday"]

for i in range(1, 5):
    base = f"../globem_temp/GLOBEM-main/data_raw/INS-W-sample_{i}"
    feat = f"{base}/FeatureData"
    try:
        scr = pd.read_csv(f"{feat}/screen.csv", low_memory=False)
        stp = pd.read_csv(f"{feat}/steps.csv", low_memory=False)

        scr_cols = ["pid", "date"]
        for seg in TIME_SEGMENTS:
            for m in SCREEN_METRICS:
                col = f"f_screen:phone_screen_rapids_{m}:{seg}"
                if col in scr.columns:
                    scr_cols.append(col)
        dfs_screen.append(scr[scr_cols])

        stp_cols = ["pid", "date"]
        for seg in TIME_SEGMENTS:
            for m in STEPS_METRICS:
                col = f"f_steps:fitbit_steps_intraday_rapids_{m}:{seg}"
                if col in stp.columns:
                    stp_cols.append(col)
        dfs_steps.append(stp[stp_cols])
        print(f"  Sample {i}: screen={len(scr)}, steps={len(stp)}")
    except Exception as e:
        print(f"  Sample {i} error: {e}")

df_screen = pd.concat(dfs_screen, ignore_index=True)
df_steps = pd.concat(dfs_steps, ignore_index=True)
df = df_screen.merge(df_steps, on=["pid", "date"], how="inner")

# Rename columns
rename = {}
for seg in TIME_SEGMENTS:
    rename[f"f_screen:phone_screen_rapids_sumdurationunlock:{seg}"] = f"screen_min_{seg}"
    rename[f"f_screen:phone_screen_rapids_countepisodeunlock:{seg}"] = f"unlocks_{seg}"
    rename[f"f_screen:phone_screen_rapids_avgdurationunlock:{seg}"] = f"avg_session_{seg}"
    rename[f"f_screen:phone_screen_rapids_maxdurationunlock:{seg}"] = f"max_session_{seg}"
    rename[f"f_screen:phone_screen_rapids_mindurationunlock:{seg}"] = f"min_session_{seg}"
    rename[f"f_screen:phone_screen_rapids_stddurationunlock:{seg}"] = f"std_session_{seg}"
    rename[f"f_steps:fitbit_steps_intraday_rapids_sumsteps:{seg}"] = f"steps_{seg}"
    rename[f"f_steps:fitbit_steps_intraday_rapids_sumdurationsedentarybout:{seg}"] = f"sedentary_min_{seg}"
    rename[f"f_steps:fitbit_steps_intraday_rapids_sumdurationactivebout:{seg}"] = f"active_min_{seg}"

df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})
df = df.dropna(subset=["screen_min_allday", "steps_allday"], how="any")

print(f"\nMerged GLOBEM: {len(df)} rows, {df.pid.nunique()} participants")

# ═══════════════════════════════════════════════════════════════
# 3. COMPUTE IS (ÍNDICE DE SATURACIÓN) PER DAY
#    v2: Robust classification + recalibrated IS
# ═══════════════════════════════════════════════════════════════

print("\nComputing IS per day (v3 — corrected sedentary)...")

# IMPORTANT: RAPIDS sedentary_bout = total_segment_time - active_time.
# This includes SLEEP and idle time (~1200-1400 min/day ≈ 20-23h).
# Real waking sedentary = 960 min (16 waking hours) - active_min.

user_avgs = df.groupby("pid").agg({
    "screen_min_allday": "mean",
    "steps_allday": "mean",
    "active_min_allday": "mean",
}).dropna()

# Derive CORRECTED sedentary: 16 waking hours minus actual active time
user_avgs["real_sedentary"] = 960 - user_avgs["active_min_allday"]

# RMSSD baseline: 20-35 ms, based on activity ratio (active_min / 960)
# More active users ≈ higher baseline RMSSD (better vagal tone)
activity_ratio = user_avgs["active_min_allday"] / 960  # 0 to ~0.7
user_avgs["synth_rmssd_baseline"] = 20 + activity_ratio * 20  # range 20-34

# ═══════════════════════════════════════════════════════════════
# CLASSIFICATION: Per-user percentile thresholds
# A segment is "entertainment" when screen-time is high relative
# to that USER's own history AND physical activity is low.
# This avoids the old bug where absolute thresholds made
# active users always "productive".
# ═══════════════════════════════════════════════════════════════

def build_user_thresholds(user_df):
    """Compute per-user percentile thresholds for each segment."""
    th = {}
    for seg in ["morning", "afternoon", "evening", "night"]:
        scol = f"screen_min_{seg}"
        stcol = f"steps_{seg}"
        scr_vals = user_df[scol].dropna()
        stp_vals = user_df[stcol].dropna()
        th[seg] = {
            "screen_p50": float(scr_vals.quantile(0.50)) if len(scr_vals) > 3 else 30,
            "screen_p75": float(scr_vals.quantile(0.75)) if len(scr_vals) > 3 else 60,
            "steps_p25": float(stp_vals.quantile(0.25)) if len(stp_vals) > 3 else 500,
        }
    # Allday thresholds
    th["allday"] = {
        "screen_p50": float(user_df["screen_min_allday"].quantile(0.50)),
        "screen_p75": float(user_df["screen_min_allday"].quantile(0.75)),
        "steps_p25": float(user_df["steps_allday"].quantile(0.25)),
    }
    return th


def classify_segment(row, seg, th):
    """
    Classify a segment as productive/entertainment/none.
    
    Entertainment IF:
      - Screen time in this segment > user's own 50th percentile for this segment
      - AND (steps in this segment < user's 25th percentile for segment,
             OR session count is low with high avg duration — binge pattern)
    
    This is relative to each user's own behavior, so a user with 22k steps/day
    can still have entertainment segments when they spend an unusually high
    amount of screen time with unusually low movement in that specific slot.
    """
    seg_screen = row.get(f"screen_min_{seg}", 0)
    seg_steps = row.get(f"steps_{seg}", 0)
    unlocks = row.get(f"unlocks_{seg}", 0)
    avg_session = row.get(f"avg_session_{seg}", 0)
    max_session = row.get(f"max_session_{seg}", 0)
    
    if seg_screen < 3:
        return "none"
    
    screen_high = seg_screen > th[seg]["screen_p50"]
    steps_low = seg_steps < th[seg]["steps_p25"]
    
    # Binge pattern: few unlocks but high total screen = long continuous sessions
    binge = (unlocks > 0 and unlocks <= 5 and avg_session > 15)
    # Single long session dominating the segment
    long_dominant = (max_session > 30 and max_session > seg_screen * 0.6)
    
    if screen_high and (steps_low or binge or long_dominant):
        return "entertainment"
    else:
        return "productive"


def compute_daily_is(row, user_baseline, th):
    """
    Compute IS for a single day (v2 — recalibrated).
    
    Key changes from v1:
    - activity_protection is capped at 0.35 (steps can't fully mask screen abuse)
    - Screen > 400 min adds a direct penalty
    - BehaviorScore uses per-segment entertainment count as a multiplier
    - IS is guaranteed to be high when entertainment segments dominate
    """
    screen = row.get("screen_min_allday", 0)
    steps = row.get("steps_allday", 0)
    active = row.get("active_min_allday", 0)
    # Corrected sedentary: 16 waking hours (960 min) minus active bout time
    real_sedentary = max(960 - active, 0)

    # ─── StressScore ──────────────────────────────────────
    screen_norm = min(screen / 600, 1)              # Saturates at 10h
    sed_norm = min(real_sedentary / 900, 1)         # Saturates at 15h waking sedentary
    # Activity protection: capped at 40% reduction
    activity_protection = min(steps / 12000, 1) * 0.40
    
    rmssd_drop = (screen_norm * 0.6 + sed_norm * 0.4) * 12 * (1 - activity_protection)
    daily_rmssd = max(user_baseline - rmssd_drop, 8)
    stress_score = min(((user_baseline - daily_rmssd) / max(user_baseline, 1)) * 100, 100)

    # ─── BehaviorScore ────────────────────────────────────
    # Base inertia: screen / (screen + effective activity)
    eff_activity = active + steps / 150
    inertia = screen / max(screen + eff_activity, 1)
    
    # Classify each segment
    segments_class = {}
    ent_count = 0
    for seg in ["morning", "afternoon", "evening", "night"]:
        c = classify_segment(row, seg, th)
        segments_class[seg] = c
        if c == "entertainment":
            ent_count += 1
    
    # Entertainment multiplier: each ent segment adds 15 points
    ent_penalty = ent_count * 15  # 0-60 points from classification
    
    # Night screen penalty (using screen after hours is worse)
    night_screen = row.get("screen_min_night", 0)
    night_penalty = min(night_screen / 60, 1) * 10 if night_screen > 30 else 0
    
    behavior_score = min(inertia * 65 + ent_penalty + night_penalty, 100)

    # ─── IS = 0.55 × StressScore + 0.45 × BehaviorScore ──
    IS = 0.55 * stress_score + 0.45 * behavior_score
    
    # Consistency guarantees: classification must correlate with IS
    if ent_count >= 2:
        IS = max(IS, 50)
    if ent_count >= 3:
        IS = max(IS, 65)
    if ent_count >= 3 and screen > th["allday"]["screen_p75"]:
        IS = max(IS, 75)
    if ent_count == 4:
        IS = max(IS, 78)
    # Raw volume guard: extreme screen days always flag
    if screen > 500 and steps < 3000:
        IS = max(IS, 75)

    return {
        "daily_rmssd": round(daily_rmssd, 2),
        "stress_score": round(stress_score, 1),
        "behavior_score": round(behavior_score, 1),
        "IS": round(IS, 1),
        "session_class": segments_class,
    }


# ═══════════════════════════════════════════════════════════════
# 4. SELECT DIVERSE USERS & BUILD OUTPUT
# ═══════════════════════════════════════════════════════════════

print("\nSelecting diverse profiles...")

selected = set()
selected.update(user_avgs.nlargest(2, "screen_min_allday").index.tolist())
selected.update(user_avgs.nsmallest(2, "screen_min_allday").index.tolist())
selected.update(user_avgs.nlargest(2, "steps_allday").index.tolist())
selected.update(user_avgs.nlargest(2, "real_sedentary").index.tolist())
# Fill remaining to reach 8 from mid-range users
remaining = [p for p in user_avgs.index if p not in selected]
import random
random.seed(42)
while len(selected) < 8 and remaining:
    selected.add(remaining.pop(0))
selected = list(selected)[:8]

output_users = []

for pid in selected:
    user_df = df[df.pid == pid].sort_values("date")
    if len(user_df) < 5:
        continue
    
    baseline = float(user_avgs.loc[pid, "synth_rmssd_baseline"])
    th = build_user_thresholds(user_df)
    
    daily = []
    for _, row in user_df.iterrows():
        day = {"date": str(row["date"])}
        for col in row.index:
            if col in ["pid", "date"]:
                continue
            val = row[col]
            if pd.notna(val):
                val = float(val)
                day[col] = round(val, 1) if val != int(val) else int(val)
        
        is_result = compute_daily_is(row, baseline, th)
        # Add corrected sedentary to daily output
        active_day = row.get("active_min_allday", 0)
        is_result["real_sedentary"] = round(max(960 - active_day, 0), 0)
        day.update(is_result)
        daily.append(day)
    
    avg_screen = float(user_avgs.loc[pid, "screen_min_allday"])
    avg_steps = float(user_avgs.loc[pid, "steps_allday"])
    avg_active = float(user_avgs.loc[pid, "active_min_allday"])
    avg_sed = round(960 - avg_active, 0)  # Corrected waking sedentary
    avg_is = np.mean([d["IS"] for d in daily])
    
    # Audit
    total_ent = sum(
        sum(1 for v in d["session_class"].values() if v == "entertainment")
        for d in daily
    )
    total_prod = sum(
        sum(1 for v in d["session_class"].values() if v == "productive")
        for d in daily
    )
    is_critical = sum(1 for d in daily if d["IS"] >= 75)
    
    output_users.append({
        "pid": pid,
        "baseline_rmssd": round(baseline, 2),
        "avg_screen": round(avg_screen, 1),
        "avg_steps": int(avg_steps),
        "avg_sedentary": round(avg_sed, 1),
        "avg_IS": round(float(avg_is), 1),
        "days": len(daily),
        "daily": daily,
    })
    
    print(f"  {pid}: screen={round(avg_screen)}min, steps={int(avg_steps)}, "
          f"avg_IS={avg_is:.1f}%, IS>75={is_critical}/{len(daily)}, "
          f"ent={total_ent}, prod={total_prod}")

output = {
    "fitbit_baseline_rmssd": round(baseline_rmssd, 2),
    "fitbit_users": sorted(fitbit_users, key=lambda x: x["rmssd"], reverse=True),
    "globem_users": sorted(output_users, key=lambda x: x["avg_IS"], reverse=True),
}

with open("gem_data.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\n=== gem_data.json SAVED ===")
print(f"Fitbit users: {len(fitbit_users)}, GLOBEM users: {len(output_users)}")
