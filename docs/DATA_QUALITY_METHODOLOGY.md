# Data Quality Methodology

To fulfill the AetherScan Zero-Fake-Data mandate and ensure the reliability of the Environmental Evidence Chain, every ingested observation must be scored.

## 1. Data Quality Score (DQS)

Each observation $O_i$ receives a $DQS \in [0, 1]$, computed as a weighted product of several quality factors:

$$DQS = Q_{fresh} \times Q_{spatial} \times Q_{sensor} \times Q_{valid}$$

### 1.1 Freshness ($Q_{fresh}$)
Decay function based on the time elapsed since the observation $\Delta t$:
- If $\Delta t < 1 \text{ hour}$: $Q_{fresh} = 1.0$
- If $1 \text{ hour} \le \Delta t \le 24 \text{ hours}$: $Q_{fresh} = e^{-\lambda \Delta t}$
- If $\Delta t > 24 \text{ hours}$: $Q_{fresh} = 0.0$ (Stale data flagged)

### 1.2 Spatial Representativeness ($Q_{spatial}$)
For a given facility or target coordinate, how relevant is the sensor?
- Ground sensor at 0 km: 1.0
- Ground sensor at $>50$ km: 0.1
- Satellite pixel covering coordinate: 0.9

### 1.3 Sensor Reliability ($Q_{sensor}$)
Based on historical calibration and variance:
- Governmental Reference Grade (e.g., CPCB): 1.0
- Low-cost sensor (e.g., uncalibrated OpenAQ): 0.6
- Satellite retrieval (cloud-free): 0.85
- Satellite retrieval (cloud-contaminated): 0.3

### 1.4 Value Validity ($Q_{valid}$)
- Value within physical bounds (e.g., $AQI \in [0, 500]$): 1.0
- Value physically impossible (e.g., $PM2.5 = -10$): 0.0 (Discard)

## 2. Fusion Confidence Score (FCS)

When multiple sources are fused (classically or quantumly), the final estimate receives a Confidence Score based on the variance of the inputs and their individual DQS:

$$FCS = \frac{\sum (DQS_i \times w_i)}{\sum w_i} \times \left(1 - \frac{\sigma}{\mu}\right)$$

Where $\sigma$ is the standard deviation of the input values and $\mu$ is the mean. High disagreement lowers confidence.

## 3. UI Representation
The Frontend must visually represent the FCS:
- **FCS > 0.8**: High Confidence (Solid green indicator)
- **0.5 < FCS <= 0.8**: Medium Confidence (Yellow indicator, explicit source breakdown)
- **FCS <= 0.5**: Low Confidence (Red indicator, "Data Disagreement" warning)
- **Missing Data**: Display "Unavailable". Never fallback to fake data.
