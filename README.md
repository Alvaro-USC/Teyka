# 📱 Proyecto GEM: Smart Wellbeing Co-Pilot
> **"Si tu smartwatch ya sabe cuándo debes despertarte, ¿por qué no permitirle que sepa cuándo debes soltar el móvil?"**

**Proyecto GEM** es una solución tecnológica diseñada para combatir el uso compulsivo del smartphone mediante el análisis de datos biométricos en tiempo real. A diferencia de las aplicaciones restrictivas, GEM actúa como un "copiloto de bienestar" que detecta estados de fatiga y estrés para sugerir actividades alternativas personalizadas.

---

## 📑 Fundamentos Académicos
La validez técnica de GEM se apoya en investigaciones recientes de detección pasiva y salud mental digital. El proyecto utiliza como base científica los hallazgos del ecosistema **StudentLife** y estudios longitudinales de 2021:

> **Cita Principal:** > Wang, W., et al. (2021). *"Social Sensing: Predicting Well-being from Heart Rate Variability and Smartphone Sensing Data in the Wild."* > Este estudio demuestra que la combinación de **HRV (Heart Rate Variability)** y los logs de uso del smartphone permite predecir niveles de estrés y bienestar con una precisión significativamente mayor que el uso de una sola fuente de datos. 

**Evidencia clave utilizada:**
* **Correlación Biométrica:** Una disminución en el marcador RMSSD precede a episodios de baja autorregulación cognitiva, facilitando el uso compulsivo de aplicaciones de gratificación instantánea.
* **Patrones de Intervención:** La investigación de *Wang et al.* confirma que los datos de sensores móviles (acelerómetro + pantalla) son indicadores robustos de fatiga mental.

---

## 💡 Nuestra Solución: El Índice de Saturación (IS)
GEM implementa un algoritmo que cruza estos hallazgos académicos con datos en tiempo real para intervenir de forma **proactiva**.

### El Algoritmo
El sistema calcula la probabilidad de uso compulsivo mediante la siguiente ponderación de variables:

$$IS = (0.60 \cdot \Delta RMSSD) + (0.40 \cdot \text{ContextoBehavioral})$$

Donde:
* **$\Delta RMSSD$:** Desviación porcentual de la variabilidad cardíaca respecto a la línea base del usuario.
* **Contexto Behavioral:** Ratio de sedentarismo (pasos = 0) vs. tiempo de pantalla activa en apps no productivas.

---

## 🛠 Workflow Técnico

El MVP se estructura mediante la integración y *backtesting* de los siguientes datasets:

1.  **Fitbit Dataset:** Extracción de métricas fisiológicas (RMSSD e IBI) para determinar el estado del sistema nervioso autónomo.
2.  **GLOBEM / StudentLife (2021 Edition):** Análisis de la taxonomía de aplicaciones (Social vs. Herramientas) y niveles de actividad física.
3.  **Modelo Predictivo:** Implementación de una arquitectura de redes neuronales recurrentes (RNN) para identificar la "ventana de vulnerabilidad" previa al inicio de una sesión de procrastinación.

---

## 🚀 Metodología de Validación

* **Validación por Backtesting:** Aplicación del modelo sobre el dataset de 4 años de GLOBEM para comprobar si el IS predice con éxito los episodios de uso prolongado registrados.
  
* **Taxonomía de Sugerencias:** Clasificación de respuestas según el estado detectado:
    * *Estrés detectado (HRV ↓):* Sugerencias de baja estimulación (respiración, hidratación).
    * *Aburrimiento detectado (Sedentarismo ↑):* Sugerencias de activación (ejercicio, hobbies).

---

## 🛠 Stack Tecnológico
* **Data Processing:** Pandas, NumPy.
* **Machine Learning:** PyTorch para el entrenamiento del modelo de series temporales.
* **Datasets:** Fitbit Kaggle Dataset & GLOBEM (StudentLife longitudinal study).
* **Integración:** Propuesta de API para Gemini/Google Workspace para personalización de sugerencias.

---
> **Proyecto GEM** — *Basado en evidencia científica para una vida digital equilibrada.*
