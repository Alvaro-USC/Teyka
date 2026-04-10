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
                    ┌──────────────────────────┐
                    │  Capa 1: Inferencia       │
                    │  de variables latentes    │
                    │                          │
                    │  HRV_proxy               │
                    │  HR_elevated_prob        │
                    │  app_category_inferred   │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  Capa 2: Modelo GBT       │
                    │  LightGBM + SHAP          │
                    │                          │
                    │  optimal_stop_score       │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    Intervención en el smartwatch
                    con explicación en lenguaje natural
```

### Features del modelo

#### Biométricas (smartwatch)

| Feature | Descripción | Por qué importa |
|---|---|---|
| `hrv_delta_30min` | Caída de HRV vs. baseline personal | Fatiga mental acumulándose |
| `hr_above_baseline` | BPM actual - BPM en reposo personal | Activación del sistema nervioso simpático |
| `movement_gap_min` | Minutos desde último movimiento significativo | Sedentarismo físico directo |
| `spO2_drop` | Desviación vs. baseline | Postura encorvada sostenida ("text neck") |
| `sleep_debt_hours` | Déficit acumulado últimas 72h | El cuerpo ya viene deteriorado |
| `sleep_last_night_quality` | Score 0-1 basado en fases de sueño | Base de recuperación del día |

#### Uso del móvil (smartphone)

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

---

## 📦 Dataset

### Dataset principal: GLOBEM (PhysioNet)

Dataset longitudinal de **4 años (2018-2021)** recogido en una universidad R-1 americana. Es uno de los pocos datasets públicos que combina datos de móvil y wearable **del mismo sujeto** con granularidad temporal.

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

### ¿Por qué GLOBEM?

- ✅ **Datos reales** — recogidos en condiciones de vida real, no en laboratorio
- ✅ **Mismo sujeto** — móvil + wearable del mismo individuo simultáneamente
- ✅ **Granularidad temporal** — segmentación por franjas horarias
- ✅ **Labels de bienestar** — permiten construir el target variable
- ✅ **Longitudinal** — 4 años, captura evolución y cambios de hábitos

### Complemento: Inferencia de variables latentes

GLOBEM no incluye HRV ni EDA directamente. Los inferimos mediante modelos auxiliares entrenados sobre correlatos comportamentales documentados en la literatura:

```python
HRV_proxy = f(sleep_quality, sleep_duration, steps_allday, screen_night, dep_weekly)
HR_elevated = f(steps_delta, screen_evening, sleep_restlessness, notification_rate)
app_category = f(hour_of_day, session_duration, unlock_frequency, day_of_week, location)
```

> En producción, estos proxies se sustituyen por señales directas del smartwatch y la Screen Time API. El modelo no cambia — solo mejora.

---

## 🤖 Modelo: LightGBM + SHAP

### ¿Por qué Gradient Boosting Trees?

- **Explicabilidad nativa** mediante SHAP values — cada predicción tiene una razón
- **Robusto con datos tabulares** de esta naturaleza
- **No requiere millones de datos** — funciona bien con histórico de semanas
- **Personalizable** — se puede fine-tunear por usuario con pocas observaciones

### Target variable

```python
optimal_stop_now = 1  # si en los próximos 15 minutos se registra:
                      #   - caída de HRV > 15% adicional, O
                      #   - inicio de patrón de scroll compulsivo, O  
                      #   - score de bienestar semanal bajo + uso nocturno elevado
                  0   # en caso contrario
```

### Pipeline

```python
# 1. Carga y preprocesamiento
df = load_globem(['screen', 'steps', 'sleep', 'dep_weekly'])
df = segment_by_time_window(df, windows=[5, 15, 30])  # minutos

# 2. Feature engineering
df['bio_digital_divergence'] = df['hr_above_baseline'] * df['session_duration']
df['compulsion_score'] = df['unlock_frequency'] / df['session_duration']
df['recovery_debt_index'] = df['sleep_debt'] + df['movement_gap'] - df['hrv_delta']
df['night_bio_risk'] = df['is_night'] * df['hr_elevated'] * df['session_duration']

# 3. Inferencia de variables latentes (Capa 1)
hrv_proxy = train_hrv_proxy_model(df)
app_cat = train_app_category_classifier(df)
df['hrv_proxy'] = hrv_proxy.predict(df)
df['app_category_inferred'] = app_cat.predict_proba(df)

# 4. Modelo principal (Capa 2)
model = lgb.LGBMClassifier(n_estimators=300, learning_rate=0.05)
model.fit(X_train, y_train)

# 5. Explicabilidad
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X)
```

### Explicabilidad en el watch

Cuando el modelo decide intervenir, el usuario recibe en su muñeca las **3 razones principales** en lenguaje natural:

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

**Por qué este perfil:**
- Ya tiene el hardware necesario (smartwatch)
- Ya está en el mindset de medir para mejorar
- La propuesta de valor resuena inmediatamente: no es control parental, es autoconocimiento

**Lo que NO somos:**
- No somos una app de control parental
- No bloqueamos el móvil a la fuerza
- No juzgamos el tiempo de pantalla — juzgamos **cómo responde tu cuerpo**

---

## 🔄 El aprendizaje continuo

WristGuard mejora con el tiempo de dos formas:

**1. Personalización individual:**  
Cada usuario refina su propio modelo con su feedback. Después de 2-3 semanas, las intervenciones son notablemente más precisas que al principio.

**2. Mejora del modelo global:**  
Los patrones anonimizados de todos los usuarios (con consentimiento explícito) alimentan mejoras al modelo base. El sistema aprende qué combinaciones biométricas predicen mejor el momento óptimo para distintos perfiles de usuario.

---

## 🚀 Stack tecnológico

| Componente | Tecnología |
|---|---|
| Modelo ML | LightGBM + SHAP |
| Backend | FastAPI (Python) |
| App móvil | React Native |
| App watch | WatchOS / Wear OS nativo |
| Datos biométricos | Apple HealthKit / Google Health Connect |
| Datos de pantalla | Screen Time API (iOS) / Digital Wellbeing API (Android) |
| Infraestructura | Cloud con procesamiento on-device para privacidad |

---

## 🔐 Privacidad por diseño

Los datos biométricos son altamente sensibles. WristGuard se construye con **Privacy by Design**:

- El modelo de inferencia se ejecuta **on-device** siempre que es posible
- Los datos en crudo nunca salen del dispositivo sin cifrado de extremo a extremo
- El usuario puede exportar, ver y eliminar todos sus datos en cualquier momento
- Cumplimiento con **GDPR** (Europa) y regulaciones equivalentes
- Los datos anonimizados para mejora del modelo requieren **opt-in explícito**

---

## 📋 Plan para el Hackathon

### Día 1: Datos y modelo
- [ ] Descargar y explorar GLOBEM (PhysioNet)
- [ ] Feature engineering sobre `screen.csv`, `steps.csv`, `sleep.csv`
- [ ] Definir y construir el target variable desde `dep_weekly.csv`
- [ ] Entrenar modelo LightGBM baseline
- [ ] Generar SHAP values y validar explicabilidad

### Día 2: Inferencia y validación
- [ ] Entrenar modelos de Capa 1 (HRV proxy, app category)
- [ ] Integrar features inferidas en el modelo principal
- [ ] Validar con cross-validation por usuario (LOSO)
- [ ] Construir demo de intervención con explicación en lenguaje natural

### Día 3: Producto y pitch
- [ ] Mockup del watch con la notificación explicable
- [ ] Dashboard de bienestar digital (Streamlit o React)
- [ ] Preparar las métricas del modelo para el pitch
- [ ] Ensayar demostración en vivo

### Métricas de éxito para el último día

```
Modelo:
  - AUC-ROC > 0.75 en validación cruzada
  - Top 3 SHAP features que tienen sentido clínico y biológico
  - Diferencia significativa entre grupos de alto/bajo riesgo

Producto:
  - Demo funcional del flujo de intervención
  - Explicación clara de por qué no es "otro timer de pantalla"
  - Story: from data → insight → action → feedback loop
```

---

## 📚 Referencias y validación científica

- **GLOBEM Dataset** — UW EXP Lab, PhysioNet (2022). Multi-year mobile and wearable sensing datasets.
- **WESAD** — Schmidt et al. (2018). Wearable Stress and Affect Detection. ACM ICMI.
- **HRV como proxy de estrés** — Shaffer & Ginsberg (2017). *An Overview of Heart Rate Variability Metrics and Norms*. Frontiers in Public Health.
- **Sedentarismo y HRV** — Thayer et al. (2010). The relationship of autonomic imbalance, heart rate variability and cardiovascular disease risk factors.
- **Uso nocturno del móvil y sueño** — Lemola et al. (2015). *Adolescents' Electronic Media Use at Night*. PLOS ONE.
- **Stress tracking wearables** — Systematic review, MDPI Algorithms (2025). 61 estudios 2016-2025.

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
