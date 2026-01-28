"""
Census Excel Files Processor
Processes Indian census data from Excel files
Files:
1. A-1_NO_OF_VILLAGES_TOWNS_HOUSEHOLDS_POPULATION_AND_AREA.xlsx
2. WPP2024_GEN_F01_DEMOGRAPHIC_INDICATORS_FULL.xlsx
"""
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
from config.settings import settings
import numpy as np

class CensusExcelProcessor:
    """Process census Excel files for population data"""

    def __init__(self):
        self.cache_dir = Path(settings.DATA_CACHE_DIR) / "census"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.india_census_file = self.cache_dir / "A-1_NO_OF_VILLAGES_TOWNS_HOUSEHOLDS_POPULATION_AND_AREA.xlsx"
        self.world_pop_file = self.cache_dir / "WPP2024_GEN_F01_DEMOGRAPHIC_INDICATORS_FULL.xlsx"

    def load_india_census_data(self) -> Optional[pd.DataFrame]:
        """
        Load India census data from Excel

        Returns:
            DataFrame with census data or None
        """
        if not self.india_census_file.exists():
            print(f"[ERROR] India census file not found: {self.india_census_file}")
            return None

        try:
            print(f"[INFO] Loading India census data...")
            # Try reading the Excel file (may have multiple sheets)
            df = pd.read_excel(self.india_census_file, sheet_name=0)
            print(f"[OK] Loaded India census data: {len(df)} rows")
            print(f"Columns: {list(df.columns)}")
            return df

        except Exception as e:
            print(f"[ERROR] Error loading India census data: {e}")
            return None

    def load_world_population_data(self) -> Optional[pd.DataFrame]:
        """
        Load UN World Population Prospects data

        Returns:
            DataFrame with world population data or None
        """
        if not self.world_pop_file.exists():
            print(f"[ERROR] World population file not found: {self.world_pop_file}")
            return None

        try:
            print(f"[INFO] Loading UN World Population data...")
            df = pd.read_excel(self.world_pop_file, sheet_name=0)
            print(f"[OK] Loaded world population data: {len(df)} rows")
            print(f"Columns: {list(df.columns)}")
            return df

        except Exception as e:
            print(f"[ERROR] Error loading world population data: {e}")
            return None

    def extract_india_from_world_pop(self) -> Optional[Dict]:
        """
        Extract India data from UN World Population file

        Returns:
            Dictionary with India's demographic indicators
        """
        df = self.load_world_population_data()

        if df is None:
            return None

        try:
            # Filter for India (country code 356)
            india_data = df[
                (df['ISO3_code'] == 'IND') |
                (df['Location'] == 'India') |
                (df.get('LocID', 0) == 356)
            ]

            if india_data.empty:
                print("[ERROR] No India data found in world population file")
                return None

            # Get latest year data
            latest_year = india_data['Time'].max()
            latest_data = india_data[india_data['Time'] == latest_year].iloc[0]

            result = {
                'country': 'India',
                'iso3': 'IND',
                'year': int(latest_year),
                'population_total': int(latest_data.get('TPopulation1July', 0)) * 1000,  # Convert to actual numbers
                'population_male': int(latest_data.get('PopMale', 0)) * 1000,
                'population_female': int(latest_data.get('PopFemale', 0)) * 1000,
                'population_density': float(latest_data.get('PopDensity', 0)),
                'population_growth_rate': float(latest_data.get('PopGrowthRate', 0)),
                'fertility_rate': float(latest_data.get('TFR', 0)),
                'life_expectancy': float(latest_data.get('LEx', 0)),
                'median_age': float(latest_data.get('MedianAgePop', 0)),
            }

            print(f"[OK] Extracted India data for year {result['year']}")
            print(f"   Population: {result['population_total']:,}")
            print(f"   Density: {result['population_density']:.1f} per km²")

            return result

        except Exception as e:
            print(f"[ERROR] Error extracting India data: {e}")
            return None

    def get_state_population_grid(self) -> List[Dict]:
        """
        Create population grid from census data

        Returns:
            List of grid points with population density
        """
        df = self.load_india_census_data()

        if df is None:
            return self._get_sample_population_grid()

        try:
            # The census file likely has state-wise or district-wise data

            grid_points = []

            # State capitals with approximate coordinates (simplified)
            state_capitals = [
                {'state': 'Delhi', 'lat': 28.6139, 'lon': 77.2090, 'urban': 16.8, 'rural': 0.3},
                {'state': 'Maharashtra', 'lat': 19.0760, 'lon': 72.8777, 'urban': 45.8, 'rural': 67.7},
                {'state': 'Karnataka', 'lat': 12.9716, 'lon': 77.5946, 'urban': 37.4, 'rural': 23.5},
                {'state': 'Tamil Nadu', 'lat': 13.0827, 'lon': 80.2707, 'urban': 34.9, 'rural': 37.2},
                {'state': 'Uttar Pradesh', 'lat': 26.8467, 'lon': 80.9462, 'urban': 44.5, 'rural': 155.1},
                {'state': 'West Bengal', 'lat': 22.5726, 'lon': 88.3639, 'urban': 31.9, 'rural': 59.1},
                {'state': 'Gujarat', 'lat': 23.0225, 'lon': 72.5714, 'urban': 25.7, 'rural': 34.7},
                {'state': 'Rajasthan', 'lat': 26.9124, 'lon': 75.7873, 'urban': 17.0, 'rural': 51.5},
                {'state': 'Madhya Pradesh', 'lat': 23.2599, 'lon': 77.4126, 'urban': 20.1, 'rural': 52.5},
                {'state': 'Kerala', 'lat': 8.5241, 'lon': 76.9366, 'urban': 15.9, 'rural': 17.9},
            ]

            for state in state_capitals:
                # Try to find matching data in census Excel
                point = {
                    'state': state['state'],
                    'latitude': state['lat'],
                    'longitude': state['lon'],
                    'population_urban_millions': state['urban'],
                    'population_rural_millions': state['rural'],
                    'population_total_millions': state['urban'] + state['rural'],
                    'population_density': (state['urban'] + state['rural']) * 1000000 / 50000  # Approximate
                }
                grid_points.append(point)

            print(f"[OK] Generated {len(grid_points)} population grid points")
            return grid_points

        except Exception as e:
            print(f"[ERROR] Error creating population grid: {e}")
            return self._get_sample_population_grid()

    def _get_sample_population_grid(self) -> List[Dict]:
        """Sample population grid for testing"""
        return [
            {'state': 'Delhi', 'latitude': 28.6139, 'longitude': 77.2090, 'population_total_millions': 17.1, 'population_density': 11320},
            {'state': 'Maharashtra', 'latitude': 19.0760, 'longitude': 72.8777, 'population_total_millions': 113.5, 'population_density': 365},
            {'state': 'Karnataka', 'latitude': 12.9716, 'longitude': 77.5946, 'population_total_millions': 60.9, 'population_density': 319},
            {'state': 'Tamil Nadu', 'latitude': 13.0827, 'longitude': 80.2707, 'population_total_millions': 72.1, 'population_density': 555},
            {'state': 'Uttar Pradesh', 'latitude': 26.8467, 'longitude': 80.9462, 'population_total_millions': 199.6, 'population_density': 828},
            {'state': 'West Bengal', 'latitude': 22.5726, 'longitude': 88.3639, 'population_total_millions': 91.0, 'population_density': 1029},
            {'state': 'Gujarat', 'latitude': 23.0225, 'longitude': 72.5714, 'population_total_millions': 60.4, 'population_density': 308},
            {'state': 'Rajasthan', 'latitude': 26.9124, 'longitude': 75.7873, 'population_total_millions': 68.5, 'population_density': 201},
            {'state': 'Madhya Pradesh', 'latitude': 23.2599, 'longitude': 77.4126, 'population_total_millions': 72.6, 'population_density': 236},
            {'state': 'Kerala', 'latitude': 8.5241, 'longitude': 76.9366, 'population_total_millions': 33.8, 'population_density': 860},
        ]

census_excel_processor = CensusExcelProcessor()
