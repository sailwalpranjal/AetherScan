from typing import Dict, Tuple, Optional
import numpy as np

class CPCBAQICalculator:
    # Format: {pollutant: [(C_low, C_high, I_low, I_high), ...]}
    BREAKPOINTS = {
        'pm25': [
            (0, 30, 0, 50),
            (31, 60, 51, 100),
            (61, 90, 101, 200),
            (91, 120, 201, 300),
            (121, 250, 301, 400),
            (251, 380, 401, 500),
        ],
        'pm10': [
            (0, 50, 0, 50),
            (51, 100, 51, 100),
            (101, 250, 101, 200),
            (251, 350, 201, 300),
            (351, 430, 301, 400),
            (431, 550, 401, 500),
        ],
        'no2': [
            (0, 40, 0, 50),
            (41, 80, 51, 100),
            (81, 180, 101, 200),
            (181, 280, 201, 300),
            (281, 400, 301, 400),
            (401, 800, 401, 500),
        ],
        'so2': [
            (0, 40, 0, 50),
            (41, 80, 51, 100),
            (81, 380, 101, 200),
            (381, 800, 201, 300),
            (801, 1600, 301, 400),
            (1601, 2400, 401, 500),
        ],
        'co': [
            (0, 1.0, 0, 50),
            (1.1, 2.0, 51, 100),
            (2.1, 10, 101, 200),
            (10.1, 17, 201, 300),
            (17.1, 34, 301, 400),
            (34.1, 50, 401, 500),
        ],
        'o3': [
            (0, 50, 0, 50),
            (51, 100, 51, 100),
            (101, 168, 101, 200),
            (169, 208, 201, 300),
            (209, 748, 301, 400),
            (749, 1000, 401, 500),
        ],
    }

    # AQI Categories
    CATEGORIES = [
        (0, 50, 'Good', '#00E400'),
        (51, 100, 'Satisfactory', '#FFFF00'),
        (101, 200, 'Moderate', '#FF7E00'),
        (201, 300, 'Poor', '#FF0000'),
        (301, 400, 'Very Poor', '#8F3F97'),
        (401, 500, 'Severe', '#7E0023'),
    ]

    @staticmethod
    def calculate_sub_index(pollutant: str, concentration: float) -> Optional[float]:
        """
        Calculate sub-index for a specific pollutant
        Formula: I = [(I_high - I_low) / (C_high - C_low)] * (C - C_low) + I_low
        """
        if pollutant not in CPCBAQICalculator.BREAKPOINTS:
            return None

        if concentration < 0:
            return None

        breakpoints = CPCBAQICalculator.BREAKPOINTS[pollutant]

        for c_low, c_high, i_low, i_high in breakpoints:
            if c_low <= concentration <= c_high:
                if c_high == c_low:
                    return float(i_low)

                sub_index = ((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low
                return round(sub_index, 2)

        # If concentration exceeds all breakpoints, use the highest category
        last_breakpoint = breakpoints[-1]
        return float(last_breakpoint[3])

    @staticmethod
    def get_category_and_color(aqi: float) -> Tuple[str, str]:
        """Get AQI category and color code"""
        for low, high, category, color in CPCBAQICalculator.CATEGORIES:
            if low <= aqi <= high:
                return category, color
        return 'Severe', '#7E0023'

    @staticmethod
    def calculate_aqi(measurements: Dict[str, float]) -> Dict:
        sub_indices = {}
        breakdowns = {}

        # Calculate sub-index for each pollutant
        for pollutant, concentration in measurements.items():
            pollutant_lower = pollutant.lower().replace('.', '').replace('_', '')

            if pollutant_lower in CPCBAQICalculator.BREAKPOINTS:
                sub_index = CPCBAQICalculator.calculate_sub_index(pollutant_lower, concentration)

                if sub_index is not None:
                    sub_indices[pollutant_lower] = sub_index
                    breakdowns[pollutant] = {
                        'concentration': concentration,
                        'sub_index': sub_index,
                        'category': CPCBAQICalculator.get_category_and_color(sub_index)[0]
                    }

        if not sub_indices:
            return {
                'aqi': 0,
                'category': 'No Data',
                'color': '#808080',
                'dominant_pollutant': 'none',
                'breakdowns': {}
            }

        max_pollutant = max(sub_indices, key=sub_indices.get)
        overall_aqi = int(round(sub_indices[max_pollutant]))

        category, color = CPCBAQICalculator.get_category_and_color(overall_aqi)

        return {
            'aqi': overall_aqi,
            'category': category,
            'color': color,
            'dominant_pollutant': max_pollutant,
            'breakdowns': breakdowns
        }

    @staticmethod
    def calculate_aqi_batch(measurements_list: list) -> list:
        """Calculate AQI for multiple measurement sets efficiently"""
        results = []
        for measurements in measurements_list:
            results.append(CPCBAQICalculator.calculate_aqi(measurements))
        return results

# Initialize global calculator instance
aqi_calculator = CPCBAQICalculator()
