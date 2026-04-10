# 📱⌚ WristGuard
### *Tu cuerpo sabe cuándo parar. Nosotros te lo decimos.*

> Los smartwatches ya deciden cuándo despertarte.  
> ¿Por qué no pueden decirte cuándo dejar el móvil?

---

## 🧭 El problema

Vivimos pegados al móvil — y lo sabemos. Pero saberlo no es suficiente para parar.

Las apps de control de tiempo de pantalla fallan porque ponen límites arbitrarios basados en el reloj, no en cómo está tu cuerpo. Dos horas de scroll ansioso a las 11 de la noche no son iguales que dos horas de vídeos relajado en el sofá. Nuestro cerebro y nuestro cuerpo saben la diferencia. Hasta ahora, nuestro móvil no.

**WristGuard** escucha a tu cuerpo y te dice cuándo es el momento óptimo para tomar un descanso — no antes, no después.

---

## 📊 El contexto: los números respaldan la oportunidad

### Usamos el móvil demasiado — y cada vez más

- **6h 34min** al día de media pasa una persona conectada a internet (DataReportal, 2025)
- El tiempo de uso de apps móviles a nivel mundial **aumentó un 30% desde 2019**
- Los jóvenes de **18 a 24 años** lideran con **5,7 horas diarias** de uso de internet (INEGI, 2024)
- En España, el **92,5% de la población** usa internet a diario (INE, 2025)

### Y queremos usarlo menos

- **1 de cada 3 consumidores** en Latinoamérica espera reducir sus actividades digitales (Bain & Company, 2025)
- El **25%** asocia la actividad digital a daños en su salud y bienestar
- El bienestar digital es uno de los **temas más buscados en Reddit y Quora** en 2025: límites de apps, gestión de notificaciones, cómo desconectarse
- La categoría "detox digital" no deja de crecer en búsquedas, podcasts y libros

### El mercado de smartwatches está listo

- **528 millones de personas** tienen smartwatch en 2026 — creciendo al 14,2% anual
- **40% de los adultos de 18-34 años** ya tiene un smartwatch — nuestro público objetivo exacto
- El **92% de los usuarios** los usa para salud y fitness — ya están en el mindset correcto
- **Gen Z (11-26 años)**: 41% de penetración, impulsada por apps de bienestar
- El mercado global alcanza **$118,4 billones en 2025** y proyecta $142 billones en 2034

> 💡 **La intersección perfecta:** un usuario que ya usa smartwatch + quiere cuidar su salud + está harto de usar demasiado el móvil. Ese usuario existe, es masivo, y no tiene una solución real todavía.

---

## 💡 La solución: WristGuard

WristGuard es una aplicación para **smartwatch + móvil** que entrena un modelo de Machine Learning personalizado para determinar, en tiempo real, cuándo es el mejor momento para que *tú específicamente* tomes un descanso del móvil.

No funciona con límites de tiempo arbitrarios.  
Funciona midiendo cómo responde **tu cuerpo** al uso de tu móvil.

### ¿Qué lo hace diferente?

| Solución actual | WristGuard |
|---|---|
| "Llevas 2h en TikTok. Parar." | "Tu ritmo cardíaco subió un 18%, llevas 40min sin moverte y son las 23:30. Es un buen momento para parar." |
| Límites arbitrarios por tiempo | Intervención basada en estado fisiológico real |
| Igual para todo el mundo | Modelo personalizado que aprende de ti |
| Caja negra | Explicación en lenguaje natural de por qué te lo dice |
| Reactivo (te bloquea) | Proactivo (te sugiere en el momento óptimo) |

---

## 🔍 Proceso de investigación: cómo llegamos a los datos correctos

Esta sección documenta el proceso de búsqueda — porque el camino importa tanto como el destino, y demuestra que la solución no fue obvia.

### El problema inicial: datasets separados

Lo primero fue buscar en Kaggle datasets acordes a la temática. Existen opciones razonables como el **"Mobile Device Usage and User Behavior Dataset"** o el **"Smartphone Usage and Behavioral Dataset"**, pero tienen un problema fundamental: **no existe relación directa entre los datasets de uso de móvil en población y los datasets de datos biométricos de smartwatch**. Son silos distintos, recogidos sobre sujetos distintos, en momentos distintos.

Entrenar un modelo con datos de móvil de una persona y biometría de otra no tiene validez para lo que queremos predecir. Usar solo datos de uso de móvil, sin biometría, es básicamente construir un timer glorificado — exactamente lo que WristGuard no quiere ser.

### La búsqueda de evidencia científica

Ante esa brecha, buscamos evidencia clínica que respaldara la relación entre factores biométricos y el abuso del teléfono: papers, reportes y datasets que conectaran ambos mundos. El hallazgo clave fue que la relación no es directa ("uso de móvil → HRV baja"), sino una **cadena causal mediada por sedentarismo, calidad del sueño y activación del sistema nervioso simpático** — y esa cadena sí está ampliamente documentada en 12 referencias clínicas (ver sección de Referencias).

### La solución: GLOBEM

El dataset que resuelve el problema de raíz es **GLOBEM** (UW EXP Lab, PhysioNet 2022) — un dataset longitudinal de **4 años (2018-2021)** que combina, del **mismo sujeto**, datos de uso de móvil y wearable en condiciones de vida real.

> 📎 [GLOBEM en GitHub](https://github.com/UW-EXP/GLOBEM/blob/main/data_raw/README.md)

Es uno de los pocos datasets públicos que permite correlacionar uso del teléfono, actividad física y calidad del sueño **a nivel individual** con granularidad horaria. Las variables que no existen directamente (HRV, HR, categoría de app) se infieren desde los correlatos comportamentales disponibles mediante el sistema de lógica borrosa descrito más adelante.

### Complemento: FitBit Dataset

Para calibrar la inferencia de HRV, usamos el **FitBit Dataset** (Kaggle, Möbius):

> 📎 [FitBit Dataset en Kaggle](https://www.kaggle.com/datasets/arashnic/fitbit)

Contiene datos de IBI (Inter-Beat Interval) de usuarios reales. A partir del IBI calculamos RMSSD — el indicador de HRV más robusto para estrés autónomo a corto plazo. Desde los `steps` determinamos niveles de sedentarismo.

```python
# Cálculo de RMSSD desde IBI (FitBit)
ibi_diffs = np.diff(ibi_series)
rmssd = np.sqrt(np.mean(ibi_diffs ** 2))

# Clasificación del nivel de estrés autónomo
hrv_stress = "bajo"    if rmssd > 50 else \
             "moderado" if rmssd > 25 else "alto"
# Ref: Frontiers in Physiology 2024 — RMSSD<25ms como umbral clínico validado
```

### Por qué esta combinación funciona

| Dataset | Qué aporta | Limitación cubierta por el otro |
|---|---|---|
| GLOBEM | Móvil + wearable del mismo sujeto, 4 años, granularidad horaria | No tiene HRV ni HR directa |
| FitBit | IBI/RMSSD real para calibrar la inferencia borrosa | No tiene datos de uso de móvil |
| Literatura clínica (12 papers) | Valida las relaciones causales entre variables | Puente entre los dos datasets |

---

## 🎯 Target variable: definición operacional

> Este es el punto que separa WristGuard de un timer glorificado. La pregunta que responde el modelo no es "¿llevas mucho tiempo en el móvil?" sino **"¿es este el momento en que tu cuerpo más se beneficiaría de un descanso?"**

### Definición formal

```python
optimal_stop_now = 1   # si EN LOS PRÓXIMOS 15 MINUTOS se cumple AL MENOS UNO de:

    condicion_A = hrv_delta_15min < -0.15
    # HRV cae >15% adicional sobre baseline personal
    # → señal de fatiga autonómica acumulándose

    condicion_B = (unlock_freq_10min > 2 * unlock_freq_personal_avg
                   AND session_duration > 20)
    # Frecuencia de desbloqueos >2x la media personal en ventana de 10 min,
    # con sesión activa de más de 20 min
    # → firma comportamental del uso compulsivo

    condicion_C = (is_night == True
                   AND screen_today > personal_p75_screen
                   AND dep_weekly_score < personal_median_dep)
    # Uso nocturno por encima del percentil 75 personal
    # + score de bienestar semanal por debajo de la mediana personal
    # → combinación nocturna de alto riesgo contextual

optimal_stop_now = 0   # en caso contrario
```

### Por qué cada condición y no otra

**Condición A (HRV):** Una caída del 15% en HRV sobre el baseline *personal* es el umbral documentado en la literatura para señal de fatiga autonómica significativa. Se usa el delta sobre el baseline personal — no un valor absoluto — porque la HRV varía enormemente entre individuos y lo que importa es el cambio respecto al propio estado basal.

**Condición B (compulsividad):** El patrón de desbloqueos frecuentes en sesiones largas es la firma comportamental del uso compulsivo. La normalización por la media personal evita penalizar a personas que simplemente usan más el móvil por trabajo. No es lo mismo abrir el móvil 14 veces para consultar algo concreto que hacerlo en bucle sin intención.

**Condición C (nocturno + bienestar):** El uso nocturno aislado puede ser inocuo. Lo que lo convierte en señal de riesgo es la combinación con un estado de bienestar ya deteriorado esa semana. Este multiplicador contextual — el estado previo del individuo — es lo que ningún timer convencional puede capturar.

### Construcción del target en GLOBEM

```python
def build_target(df: pd.DataFrame, window_min: int = 15) -> pd.Series:
    """
    Construye optimal_stop_now para cada instante del dataset GLOBEM.
    """
    cond_A = df['hrv_delta_future_15min'] < -0.15

    cond_B = (
        (df['unlock_freq_10min'] > 2 * df['unlock_freq_personal_avg']) &
        (df['session_duration'] > 20)
    )

    cond_C = (
        df['is_night'] &
        (df['screen_today'] > df['screen_p75_personal']) &
        (df['dep_weekly_score'] < df['dep_median_personal'])
    )

    return (cond_A | cond_B | cond_C).astype(int)
```

---

## 🏗️ Arquitectura técnica

### Fuentes de datos

```
┌─────────────────────────────────────┐     ┌──────────────────────────────────────┐
│         SMARTWATCH                  │     │           SMARTPHONE                 │
│                                     │     │                                      │
│  • Frecuencia cardíaca (HR)         │     │  • Duración de sesión activa         │
│  • Variabilidad cardíaca (HRV)      │     │  • Tiempo total de pantalla hoy      │
│  • Pasos / movimiento               │     │  • Categoría de app en uso           │
│  • Calidad y duración del sueño     │     │  • Frecuencia de desbloqueos         │
│  • SpO2 (saturación de oxígeno)     │     │  • Tasa de notificaciones            │
│  • Tiempo sin movimiento            │     │  • Hora del día / día de la semana   │
└─────────────────────────────────────┘     └──────────────────────────────────────┘
                    │                                         │
                    └──────────────┬──────────────────────────┘
                                   ▼
                        Feature Engineering
                    (ventanas de 5, 15, 30 min)
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Capa 1: Inferencia Borrosa   │
                    │  (Sistema Mamdani)            │
                    │                              │
                    │  HRV_index    [0.0 – 1.0]    │
                    │  HR_stress    [0.0 – 1.0]    │
                    │  bio_digital_risk             │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Capa 2: Modelo GBT           │
                    │  LightGBM + SHAP              │
                    │                              │
                    │  optimal_stop_score          │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    Intervención en el smartwatch
                    con explicación en lenguaje natural
```

### Features del modelo

#### Biométricas (smartwatch / FitBit)

| Feature | Descripción | Por qué importa |
|---|---|---|
| `hrv_delta_30min` | Caída de HRV vs. baseline personal | Fatiga mental acumulándose |
| `hr_above_baseline` | BPM actual - BPM en reposo personal | Activación del sistema nervioso simpático |
| `movement_gap_min` | Minutos desde último movimiento significativo | Sedentarismo físico directo |
| `spO2_drop` | Desviación vs. baseline | Postura encorvada sostenida ("text neck") |
| `sleep_debt_hours` | Déficit acumulado últimas 72h | El cuerpo ya viene deteriorado |
| `sleep_last_night_quality` | Score 0-1 basado en fases de sueño | Base de recuperación del día |

#### Uso del móvil (smartphone / GLOBEM screen.csv)

| Feature | Descripción | Por qué importa |
|---|---|---|
| `session_duration_current` | Duración de la sesión activa | La sesión en curso |
| `total_screen_today` | Tiempo total de pantalla hoy | Acumulación diaria |
| `app_category` | Categoría de la app activa | Redes sociales ≠ trabajo ≠ vídeo |
| `unlock_frequency_hour` | Desbloqueos en la última hora | Comportamiento compulsivo |
| `notification_rate_15min` | Notificaciones en 15 min | Fragmentación atencional |
| `hour_of_day` + `is_night` | Contexto temporal | El uso nocturno es más dañino |

#### Features derivadas (las más potentes)

| Feature | Cálculo | Intuición |
|---|---|---|
| `bio_digital_divergence` | `hr_above_baseline × session_duration` | Cuerpo activado + uso largo = señal fuerte |
| `recovery_debt_index` | `sleep_debt + movement_gap - hrv_delta` | Cuánto debe el cuerpo ya |
| `compulsion_score` | `unlock_frequency / session_duration` | Muchos desbloqueos, sesiones cortas |
| `night_bio_risk` | `is_night × hr_elevated × session_duration` | Multiplicador nocturno |
| `context_stress_load` | Combinación HRV + notificaciones + hora | Carga cognitiva estimada |
| `bio_digital_risk` ⭐ | `hr_stress_fuzzy × (1 - hrv_index_fuzzy) × session_norm` | **Cuerpo activado + HRV baja + uso prolongado** |

> ⭐ `bio_digital_risk` es la feature esperada en top-3 SHAP. Integra directamente la salida del sistema borroso y tiene interpretación clínica directa: *cuerpo fisiológicamente activado, HRV baja, y uso prolongado del móvil al mismo tiempo*.

---

## 📦 Dataset

### Dataset principal: GLOBEM (PhysioNet)

```
GLOBEM/
├── screen.csv       → PhoneUsage: tiempo de pantalla, desbloqueos
├── steps.csv        → PhysicalActivity: pasos, sedentarismo
├── sleep.csv        → Sleep: duración, calidad, fragmentación
├── location.csv     → Location: movilidad, rutinas
├── call.csv         → Call: patrones de comunicación
├── bluetooth.csv    → Bluetooth: interacción social
└── dep_weekly.csv   → Labels: bienestar semanal (EMA surveys)
```

Cada feature está segmentada por franja horaria: `morning`, `afternoon`, `evening`, `night`, `allday`, `7dhist`, `14dhist`.

### Complemento: Inferencia de variables latentes

GLOBEM no incluye HRV ni HR directamente. Se infieren mediante un **sistema de lógica borrosa Mamdani** calibrado con el FitBit Dataset:

```python
HRV_index = fuzzy_mamdani(sleep_quality, sleep_debt, daily_steps, screen_night)
HR_stress  = fuzzy_mamdani(daily_steps, sleep_debt, screen_night, unlock_frequency)
```

> En producción, estos proxies se sustituyen por señales directas del smartwatch. El modelo no cambia — solo mejora.

---

## 🧠 Capa 1: Inferencia Borrosa (Sistema Mamdani)

### ¿Por qué lógica borrosa?

La biología no es binaria. El estrés no es "sí/no". La fatiga no aparece de golpe. Los estados fisiológicos son **graduales, solapados y dependientes del contexto** — exactamente el dominio para el que se diseñaron los conjuntos borrosos (Zadeh, 1965).

Un sistema de reglas nítidas fallaría porque:
- Una persona sedentaria tiene un baseline distinto a una deportista
- El mismo HRV bajo puede indicar recuperación post-ejercicio o estrés crónico
- Las variables interactúan — sueño malo + pantalla nocturna es peor que cada uno por separado

Está respaldado directamente por la literatura: sistemas Mamdani han sido validados para estimación de estrés fisiológico con precisión dentro de 10 segundos (Zalabarria et al., IEEE Access 2020; Sierra et al., IEEE Trans. Ind. Electron. 2011).

### Variables de entrada y conjuntos borrosos

| Variable | Universo | Conjuntos | Ancla clínica |
|---|---|---|---|
| `sleep_quality` | [0, 10] | POBRE / REGULAR / BUENA | PSQI > 5 = sueño pobre (validado en >100 estudios) |
| `sleep_debt` | [0, 72h] | BAJO / MODERADO / ALTO | >3h = deterioro cognitivo significativo |
| `daily_steps` | [0, 20000] | MUY_SEDENTARIO / SEDENTARIO / ACTIVO / MUY_ACTIVO | Umbrales OMS/CDC |
| `screen_night` | [0, 480 min] | NINGUNO / MODERADO / EXCESIVO | >60 min = supresión melatonina significativa |

### Variables de salida

| Salida | Rango | Conjuntos | Ancla clínica |
|---|---|---|---|
| `HRV_index` | [0.0, 1.0] | MUY_BAJA / BAJA / NORMAL / ALTA | RMSSD <25 ms = inhibición vagal; >50 ms = parasimpático saludable |
| `HR_stress` | [0.0, 1.0] | RELAJADO / LIGERAMENTE_ELEVADO / ELEVADO / MUY_ELEVADO | +0.24 bpm/hora sedentaria (meta-análisis MDPI 2021) |

### Base de reglas clínicas (selección)

```
R1:  SI sueño=POBRE  ∧ pasos=MUY_SEDENTARIO
     → HRV=MUY_BAJA                          [peso 0.95]
     Ref: ScienceDirect 2024 (correlación PSQI-SDNN)

R2:  SI sueño=POBRE  ∧ pantalla_nocturna=EXCESIVA
     → HRV=MUY_BAJA                          [peso 0.90]
     Ref: Lemola 2015 + Frontiers Physiology 2025

R5:  SI sueño=BUENA  ∧ pasos=MUY_ACTIVO
     → HRV=ALTA                              [peso 0.90]
     Ref: Frontiers Physiology 2025 (HIIT-RMSSD)

R9:  SI pasos=MUY_SEDENTARIO ∧ pantalla_nocturna=EXCESIVA ∧ hora=NOCHE
     → HR_stress=MUY_ELEVADO                 [peso 0.90]
     Ref: Sedentary Behaviour & Psychobiology, ScienceDirect 2022

R14: SI hora=NOCHE ∧ sesion_activa=LARGA ∧ sueño=POBRE
     → HR_stress=MUY_ELEVADO                 [peso 0.93]

R15: SI sueño=POBRE ∧ pasos=MUY_SEDENTARIO
       ∧ pantalla_nocturna=EXCESIVA ∧ deuda_sueño=ALTA
     → HRV=MUY_BAJA ∧ HR_stress=MUY_ELEVADO  [peso 0.97]
     ★ "Tormenta perfecta" — Ref: Sleep Journal 2023, MIDUS II n=966
```

La regla R15 es la más importante: captura la **sinergia entre variables** que ningún sistema de umbral nítido puede representar.

### Ejemplo de inferencia (21:45, usuario típico)

```
Inputs:  sleep_quality=0.35 · sleep_debt=2.5h · steps=2200 · screen_night=85min

Fuzzificación:
  sleep_quality → μ_POBRE=0.72, μ_REGULAR=0.28
  daily_steps   → μ_MUY_SED=0.85, μ_SED=0.15
  screen_night  → μ_EXCESIVO=0.88, μ_MODERADO=0.12

Reglas activas (t-norma mínimo):
  R1:  min(0.72, 0.85) = 0.72  → HRV_MUY_BAJA
  R2:  min(0.72, 0.88) = 0.72  → HRV_MUY_BAJA
  R15: min(0.72, 0.85, 0.88, 0.25) = 0.25 → HRV_MUY_BAJA + HR_MUY_ELEVADO

Defuzzificación (centroide):
  HRV_index = 0.18  →  "muy baja"
  HR_stress  = 0.83  →  "muy elevado"
```

### Integración con el modelo GBT

```python
def enrich_globem_features(df: pd.DataFrame) -> pd.DataFrame:
    results = df.apply(lambda row: infer_biometrics(
        sleep_q  = row['sleep_quality_normalized'],
        sleep_d  = row['sleep_debt_hours'],
        steps    = row['f_steps:fitbit_steps_rapids_sumsteps:allday'],
        screen_n = row['f_screen:phone_screen_rapids_sumdurationunlock:night']
    ), axis=1)

    df['hrv_index_fuzzy'] = [r['hrv_index'] for r in results]
    df['hr_stress_fuzzy'] = [r['hr_stress'] for r in results]

    # Feature de interacción → top-3 SHAP esperado
    df['bio_digital_risk'] = (
        df['hr_stress_fuzzy'] *
        (1 - df['hrv_index_fuzzy']) *
        df['session_duration_norm']
    )
    return df
```

### Limitaciones y mitigaciones

| Limitación | Evidencia | Mitigación |
|---|---|---|
| HRV-sedentarismo directo: efecto débil | IJERPH 2021: β=0.24 bpm/h, no clínicamente significativo aislado | Modelado como cadena causal, no correlación directa |
| Variabilidad individual alta | Kim et al. 2018: HRV afectada por genética y temporada | Normalización por baseline personal (`_norm`) |
| GLOBEM sin HR directa | Dataset de fitness tracker, no clínico | El proxy es feature del GBT, no sustituto clínico |
| Sistema borroso sin aprendizaje | Reglas fijas basadas en literatura | Pesos calibrables con datos GLOBEM mediante ANFIS |

---

## 🤖 Capa 2: LightGBM + SHAP

### ¿Por qué Gradient Boosting Trees?

- **Explicabilidad nativa** mediante SHAP values — cada predicción tiene una razón
- **Robusto con datos tabulares** de esta naturaleza
- **No requiere millones de datos** — funciona bien con histórico de semanas
- **Personalizable** — se puede fine-tunear por usuario con pocas observaciones

### Pipeline completo

```python
# 1. Carga y preprocesamiento
df = load_globem(['screen', 'steps', 'sleep', 'dep_weekly'])
df = segment_by_time_window(df, windows=[5, 15, 30])

# 2. Feature engineering
df['bio_digital_divergence'] = df['hr_above_baseline'] * df['session_duration']
df['compulsion_score']       = df['unlock_frequency'] / df['session_duration']
df['recovery_debt_index']    = df['sleep_debt'] + df['movement_gap'] - df['hrv_delta']
df['night_bio_risk']         = df['is_night'] * df['hr_elevated'] * df['session_duration']

# 3. Capa 1: inferencia borrosa
df = enrich_globem_features(df)   # añade hrv_index_fuzzy, hr_stress_fuzzy, bio_digital_risk

# 4. Target variable
df['target'] = build_target(df, window_min=15)

# 5. Validación LOSO (Leave-One-Subject-Out)
groups = df['participant_id']
cv     = LeaveOneGroupOut()
model  = lgb.LGBMClassifier(n_estimators=300, learning_rate=0.05)
scores = cross_val_score(model, X, y, groups=groups, cv=cv, scoring='roc_auc')
print(f"AUC-ROC LOSO: {scores.mean():.3f} ± {scores.std():.3f}")

# 6. Explicabilidad
model.fit(X_train, y_train)
explainer   = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X)
```

### Validación: Leave-One-Subject-Out (LOSO)

La validación LOSO es crítica: entrenar y testar en el mismo sujeto inflaría artificialmente el AUC porque el modelo aprendería los patrones idiosincrásicos de cada persona. LOSO evalúa si el modelo generaliza a sujetos nuevos — que es exactamente lo que necesita hacer en producción.

```
Para N sujetos en GLOBEM:
  fold_i: entrenar en todos menos sujeto_i, testar en sujeto_i
  → AUC promedio sobre todos los folds = métrica de generalización real
```

### Explicabilidad en el watch

```
🟡 "Buen momento para un descanso"

↑ Llevas 42 min sin moverte
↑ Tu ritmo cardíaco subió un 22%
🌙 Son las 23:15 y llevas 90 min de pantalla
```

---

## 📱 Producto: Flujo de usuario

```
1. ONBOARDING (semana 1)
   └── El modelo aprende tu baseline personal
       (HR en reposo, HRV típica, patrones de sueño, horarios)

2. DETECCIÓN PASIVA
   └── WristGuard recoge datos en segundo plano
       sin que el usuario haga nada

3. INTERVENCIÓN INTELIGENTE
   └── Vibración suave en el watch
   └── Mensaje con las 3 razones principales (SHAP)
   └── Sugerencia, nunca bloqueo forzado

4. FEEDBACK DEL USUARIO
   └── "¿Era buen momento?" → el modelo aprende y mejora
   └── Reinforcement learning ligero sobre preferencias personales

5. DASHBOARD SEMANAL
   └── Score de bienestar digital
   └── Tus mejores y peores momentos de la semana
   └── Tendencias de tus métricas biométricas
```

---

## 🎯 Usuario objetivo

**Perfil principal:**
- 18-35 años, con smartwatch (Apple Watch, Galaxy Watch, Garmin, Fitbit)
- Consciente de que usa demasiado el móvil
- Le importa su salud y bienestar — ya usa apps de fitness o meditación
- Orientado a la optimización personal ("quantified self")

**Lo que NO somos:**
- No somos una app de control parental
- No bloqueamos el móvil a la fuerza
- No juzgamos el tiempo de pantalla — juzgamos **cómo responde tu cuerpo**

---

## 🔄 El aprendizaje continuo

**1. Personalización individual:**  
Cada usuario refina su propio modelo con su feedback. Después de 2-3 semanas, las intervenciones son notablemente más precisas que al principio.

**2. Mejora del modelo global:**  
Los patrones anonimizados de todos los usuarios (con consentimiento explícito) alimentan mejoras al modelo base. El sistema aprende qué combinaciones biométricas predicen mejor el momento óptimo para distintos perfiles.

---

## 🚀 Stack tecnológico

| Componente | Tecnología |
|---|---|
| Inferencia borrosa | scikit-fuzzy (Mamdani) |
| Modelo ML | LightGBM + SHAP |
| Backend | FastAPI (Python) |
| App móvil | React Native |
| App watch | WatchOS / Wear OS nativo |
| Datos biométricos | Apple HealthKit / Google Health Connect |
| Datos de pantalla | Screen Time API (iOS) / Digital Wellbeing API (Android) |
| Infraestructura | Cloud con procesamiento on-device para privacidad |

---

## 🔐 Privacidad por diseño

- El modelo de inferencia se ejecuta **on-device** siempre que es posible
- Los datos en crudo nunca salen del dispositivo sin cifrado de extremo a extremo
- El usuario puede exportar, ver y eliminar todos sus datos en cualquier momento
- Cumplimiento con **GDPR** y regulaciones equivalentes
- Los datos anonimizados para mejora del modelo requieren **opt-in explícito**

---

## 📋 Plan para el Hackathon

### Día 1: Datos y modelo base
- [ ] Descargar GLOBEM (PhysioNet) y FitBit Dataset (Kaggle)
- [ ] Explorar `screen.csv`, `steps.csv`, `sleep.csv`, `dep_weekly.csv`
- [ ] Calcular RMSSD desde IBI del FitBit para calibrar funciones de pertenencia
- [ ] Feature engineering: `compulsion_score`, `recovery_debt_index`, `night_bio_risk`
- [ ] Construir `target` con `build_target()` y verificar distribución de clases

### Día 2: Inferencia borrosa y validación
- [ ] Implementar sistema Mamdani con `scikit-fuzzy`
- [ ] Calibrar funciones de pertenencia con distribuciones reales de GLOBEM
- [ ] Integrar `hrv_index_fuzzy`, `hr_stress_fuzzy` y `bio_digital_risk` en el pipeline
- [ ] Validación LOSO — reportar AUC-ROC por sujeto y media
- [ ] Construir demo de intervención con explicación en lenguaje natural

### Día 3: Producto y pitch
- [ ] Mockup del watch con la notificación explicable
- [ ] Dashboard de bienestar digital (Streamlit o React)
- [ ] Preparar métricas del modelo para el pitch
- [ ] Ensayar demostración en vivo

### Métricas de éxito

```
Modelo:
  - AUC-ROC > 0.75 en validación LOSO
  - bio_digital_risk en top-3 SHAP features
  - Top-3 SHAP features con interpretación clínica coherente
  - AUC significativamente superior al baseline (solo tiempo de pantalla)

Inferencia borrosa:
  - hrv_index y hr_stress coherentes con los ejemplos clínicos documentados
  - R15 ("tormenta perfecta") activa en los casos esperados

Pitch:
  - Demo funcional del flujo completo: sensor → inferencia → modelo → intervención
  - Respuesta clara a "¿por qué no es un timer?" → predice desde biometría, no desde el reloj
  - Story: data gap → GLOBEM como solución → cadena causal → modelo explicable
```

---

## 📚 Referencias y validación científica

### Datos y datasets
- **GLOBEM Dataset** — UW EXP Lab, PhysioNet (2022). [GitHub](https://github.com/UW-EXP/GLOBEM/blob/main/data_raw/README.md)
- **FitBit Dataset** — Möbius, Kaggle (2021). [Kaggle](https://www.kaggle.com/datasets/arashnic/fitbit)
- **WESAD** — Schmidt et al. (2018). Wearable Stress and Affect Detection. ACM ICMI.

### HRV, sueño y actividad física
- *Heart Rate Variability, Sleep Quality and Physical Activity in Medical Students*. ScienceDirect, 2024.
- *Associations Between Daily HRV and Self-Reported Wellness*. MDPI Sensors, 2025. β=0.510 (sleep).
- *Pre-sleep HRV predicts chronic insomnia*. Frontiers in Physiology, 2025.
- *Interaction between exercise and sleep with HRV*. European Journal of Applied Physiology, 2025.
- *Impact of exhaustive exercise on ANS*. Frontiers in Physiology, 2024. RMSSD<25ms como umbral clínico.
- *Associations of Sedentary Time with HR and HRV: Meta-analysis*. MDPI IJERPH, 2021. β=0.24 bpm/h.
- *Sedentary Lifestyle: Updated Evidence*. PMC, 2020.
- *Sedentary Behaviour and Psychobiological Stress Reactivity*. Neuroscience & Biobehavioral Reviews, 2022.
- *Combined effect of poor sleep and low HRV on metabolic syndrome*. Sleep Journal, 2023. MIDUS II, n=966.

### Lógica borrosa para estrés fisiológico
- Sierra et al. (2011). *A Stress-Detection System Based on Physiological Signals and Fuzzy Logic*. IEEE Trans. Ind. Electron.
- Zalabarria et al. (2020). *A low-cost portable solution for stress estimation based on real-time fuzzy algorithm*. IEEE Access 8: 74118–74128.
- *State-of-the-Art of Stress Prediction from HRV Using AI*. Cognitive Computation, Springer, 2023. Revisión de 43 estudios.
- *Predicting Stress Using Physiological Data*. AIMS Neuroscience, 2024.

### Uso nocturno y sueño
- Lemola et al. (2015). *Adolescents' Electronic Media Use at Night*. PLOS ONE.
- Shaffer & Ginsberg (2017). *An Overview of HRV Metrics and Norms*. Frontiers in Public Health.

---

## 👥 El equipo

*[Añadir nombres y roles del equipo aquí]*

---

## 📄 Licencia

MIT License — ver `LICENSE` para más detalles.

---

<div align="center">

**WristGuard** — *Porque tu cuerpo merece una segunda opinión.*

⌚ + 📱 + 🧠 = 🌿

</div>
