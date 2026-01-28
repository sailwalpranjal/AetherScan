"""
Census India Data Loader
Loads population and demographic data
No API key required - Direct downloads
Data source: https://censusindia.gov.in/
"""
import pandas as pd
import httpx
from typing import List, Dict, Optional
from pathlib import Path
from config.settings import settings
from db.database import db_manager

class CensusLoader:
    """Load population data from Census India"""

    def __init__(self):
        self.cache_dir = Path(settings.DATA_CACHE_DIR) / "census"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.session: Optional[httpx.AsyncClient] = None

        # Census data files
        self.datasets = {
            'population': {
                'file': 'census_population.csv',
                'description': 'Population by district',
                'url': 'https://censusindia.gov.in/'
            },
            'density': {
                'file': 'census_density.csv',
                'description': 'Population density by district',
                'url': 'https://censusindia.gov.in/'
            }
        }

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session"""
        if self.session is None:
            self.session = httpx.AsyncClient(timeout=60.0)
        return self.session

    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.aclose()
            self.session = None

    def load_population_data(self) -> List[Dict]:
        """
        Load population data from census Excel file

        Returns:
            List of population records with coordinates
        """
        # Try Excel file first
        excel_file = self.cache_dir / 'A-1_NO_OF_VILLAGES_TOWNS_HOUSEHOLDS_POPULATION_AND_AREA.xlsx'
        csv_file = self.cache_dir / self.datasets['population']['file']

        if excel_file.exists():
            try:
                print(f"Loading census data from Excel: {excel_file}")
                df = pd.read_excel(excel_file, engine='openpyxl')

                # Filter for district-level total population (not rural/urban breakdown)
                # Column headers based on the screenshot:
                # E: Name, F: Total/Rural/Urban, K: Persons (Population), N: Area, O: Density

                # Get only Total rows for districts
                district_data = df[
                    (df.iloc[:, 5] == 'Total') &  # Column F: Total/Rural/Urban
                    (df.iloc[:, 3].str.contains('District', case=False, na=False))  # Column D: Level indicator
                ].copy()

                population_data = []
                district_coords = self._get_district_coordinates()

                for _, row in district_data.iterrows():
                    district_name = str(row.iloc[4]) if pd.notna(row.iloc[4]) else ''  # Column E: Name
                    population = int(row.iloc[10]) if pd.notna(row.iloc[10]) else 0  # Column K: Persons
                    area = float(row.iloc[13]) if pd.notna(row.iloc[13]) else 0  # Column N: Area
                    density = float(row.iloc[14]) if pd.notna(row.iloc[14]) else 0  # Column O: Density

                    # Try to get coordinates from mapping
                    coords = district_coords.get(district_name, district_coords.get(district_name.split()[0], None))

                    if coords and population > 0:
                        population_data.append({
                            'location': district_name,
                            'latitude': coords['lat'],
                            'longitude': coords['lon'],
                            'population': population,
                            'density': density if density > 0 else (population / area if area > 0 else 0),
                            'state': coords.get('state', ''),
                            'area': area
                        })

                if population_data:
                    print(f"Loaded {len(population_data)} districts from Excel")
                    return population_data

            except Exception as e:
                # Clean error message without stack trace
                if "openpyxl" in str(e):
                    print(f"[WARN]  Excel support not installed. Run: pip install openpyxl")
                else:
                    print(f"[WARN]  Could not load Excel population data")

        # Try CSV fallback
        if csv_file.exists():
            try:
                df = pd.read_csv(csv_file)

                population_data = []
                for _, row in df.iterrows():
                    population_data.append({
                        'location': row.get('District', row.get('district', '')),
                        'latitude': float(row.get('Latitude', row.get('latitude', 0))),
                        'longitude': float(row.get('Longitude', row.get('longitude', 0))),
                        'population': int(row.get('Population', row.get('population', 0))),
                        'density': float(row.get('Density', row.get('density', 0))),
                        'state': row.get('State', row.get('state', ''))
                    })

                return population_data

            except Exception as e:
                print(f"Error loading CSV population data: {e}")

        # Use sample data as last resort (silently)
        return self._get_sample_population_data()

    def load_density_data(self) -> List[Dict]:
        """Load population density data"""
        cache_file = self.cache_dir / self.datasets['density']['file']

        if not cache_file.exists():
            return self._get_sample_density_data()

        try:
            df = pd.read_csv(cache_file)

            density_data = []
            for _, row in df.iterrows():
                density_data.append({
                    'location': row.get('District', row.get('district', '')),
                    'latitude': float(row.get('Latitude', row.get('latitude', 0))),
                    'longitude': float(row.get('Longitude', row.get('longitude', 0))),
                    'density': float(row.get('Density', row.get('density', 0))),
                    'state': row.get('State', row.get('state', ''))
                })

            return density_data

        except Exception as e:
            print(f"Error loading density data: {e}")
            return self._get_sample_density_data()

    async def save_to_database(self):
        """Save population data to database"""
        population_data = self.load_population_data()

        for record in population_data:
            try:
                await db_manager.execute(
                    """
                    INSERT OR REPLACE INTO population_data
                    (location, latitude, longitude, population, density, state)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record['location'],
                        record['latitude'],
                        record['longitude'],
                        record['population'],
                        record['density'],
                        record['state']
                    )
                )
            except Exception as e:
                print(f"Error saving population data: {e}")

    def _get_sample_population_data(self) -> List[Dict]:
        """Sample population data for major Indian cities"""
        return [
            {'location': 'Mumbai', 'latitude': 19.0760, 'longitude': 72.8777, 'population': 12442373, 'density': 20694, 'state': 'Maharashtra'},
            {'location': 'Delhi', 'latitude': 28.7041, 'longitude': 77.1025, 'population': 11007835, 'density': 11297, 'state': 'Delhi'},
            {'location': 'Bengaluru', 'latitude': 12.9716, 'longitude': 77.5946, 'population': 8443675, 'density': 4378, 'state': 'Karnataka'},
            {'location': 'Hyderabad', 'latitude': 17.3850, 'longitude': 78.4867, 'population': 6809970, 'density': 18480, 'state': 'Telangana'},
            {'location': 'Ahmedabad', 'latitude': 23.0225, 'longitude': 72.5714, 'population': 5577940, 'density': 11400, 'state': 'Gujarat'},
            {'location': 'Chennai', 'latitude': 13.0827, 'longitude': 80.2707, 'population': 4646732, 'density': 26553, 'state': 'Tamil Nadu'},
            {'location': 'Kolkata', 'latitude': 22.5726, 'longitude': 88.3639, 'population': 4486679, 'density': 24252, 'state': 'West Bengal'},
            {'location': 'Pune', 'latitude': 18.5204, 'longitude': 73.8567, 'population': 3124458, 'density': 7256, 'state': 'Maharashtra'},
            {'location': 'Jaipur', 'latitude': 26.9124, 'longitude': 75.7873, 'population': 3046163, 'density': 6500, 'state': 'Rajasthan'},
            {'location': 'Surat', 'latitude': 21.1702, 'longitude': 72.8311, 'population': 4467797, 'density': 13000, 'state': 'Gujarat'},
            {'location': 'Lucknow', 'latitude': 26.8467, 'longitude': 80.9462, 'population': 2817105, 'density': 10133, 'state': 'Uttar Pradesh'},
            {'location': 'Kanpur', 'latitude': 26.4499, 'longitude': 80.3319, 'population': 2765348, 'density': 8000, 'state': 'Uttar Pradesh'},
            {'location': 'Nagpur', 'latitude': 21.1458, 'longitude': 79.0882, 'population': 2405665, 'density': 7850, 'state': 'Maharashtra'},
            {'location': 'Indore', 'latitude': 22.7196, 'longitude': 75.8577, 'population': 1960631, 'density': 8200, 'state': 'Madhya Pradesh'},
            {'location': 'Patna', 'latitude': 25.5941, 'longitude': 85.1376, 'population': 1684222, 'density': 13500, 'state': 'Bihar'},
            {'location': 'Bhopal', 'latitude': 23.2599, 'longitude': 77.4126, 'population': 1798218, 'density': 7789, 'state': 'Madhya Pradesh'},
            {'location': 'Ludhiana', 'latitude': 30.9010, 'longitude': 75.8573, 'population': 1618879, 'density': 6800, 'state': 'Punjab'},
            {'location': 'Agra', 'latitude': 27.1767, 'longitude': 78.0081, 'population': 1585705, 'density': 8500, 'state': 'Uttar Pradesh'},
            {'location': 'Vadodara', 'latitude': 22.3072, 'longitude': 73.1812, 'population': 1670806, 'density': 7650, 'state': 'Gujarat'},
            {'location': 'Kochi', 'latitude': 9.9312, 'longitude': 76.2673, 'population': 602046, 'density': 6100, 'state': 'Kerala'},
        ]

    def _get_sample_density_data(self) -> List[Dict]:
        """Sample density data"""
        return [record for record in self._get_sample_population_data()]

    def _get_district_coordinates(self) -> Dict[str, Dict]:
        """
        District name to coordinates mapping for major Indian districts
        This helps geocode the census Excel data which doesn't have lat/lon
        """
        return {
            # Major Metro Districts
            'Mumbai': {'lat': 19.0760, 'lon': 72.8777, 'state': 'Maharashtra'},
            'Mumbai Suburban': {'lat': 19.1136, 'lon': 72.9081, 'state': 'Maharashtra'},
            'Delhi': {'lat': 28.7041, 'lon': 77.1025, 'state': 'Delhi'},
            'Bengaluru': {'lat': 12.9716, 'lon': 77.5946, 'state': 'Karnataka'},
            'Bengaluru Urban': {'lat': 12.9716, 'lon': 77.5946, 'state': 'Karnataka'},
            'Hyderabad': {'lat': 17.3850, 'lon': 78.4867, 'state': 'Telangana'},
            'Ahmedabad': {'lat': 23.0225, 'lon': 72.5714, 'state': 'Gujarat'},
            'Chennai': {'lat': 13.0827, 'lon': 80.2707, 'state': 'Tamil Nadu'},
            'Kolkata': {'lat': 22.5726, 'lon': 88.3639, 'state': 'West Bengal'},
            'Pune': {'lat': 18.5204, 'lon': 73.8567, 'state': 'Maharashtra'},

            # State Capitals & Major Cities
            'Jaipur': {'lat': 26.9124, 'lon': 75.7873, 'state': 'Rajasthan'},
            'Surat': {'lat': 21.1702, 'lon': 72.8311, 'state': 'Gujarat'},
            'Lucknow': {'lat': 26.8467, 'lon': 80.9462, 'state': 'Uttar Pradesh'},
            'Kanpur': {'lat': 26.4499, 'lon': 80.3319, 'state': 'Uttar Pradesh'},
            'Kanpur Nagar': {'lat': 26.4499, 'lon': 80.3319, 'state': 'Uttar Pradesh'},
            'Nagpur': {'lat': 21.1458, 'lon': 79.0882, 'state': 'Maharashtra'},
            'Indore': {'lat': 22.7196, 'lon': 75.8577, 'state': 'Madhya Pradesh'},
            'Patna': {'lat': 25.5941, 'lon': 85.1376, 'state': 'Bihar'},
            'Bhopal': {'lat': 23.2599, 'lon': 77.4126, 'state': 'Madhya Pradesh'},
            'Ludhiana': {'lat': 30.9010, 'lon': 75.8573, 'state': 'Punjab'},
            'Agra': {'lat': 27.1767, 'lon': 78.0081, 'state': 'Uttar Pradesh'},
            'Vadodara': {'lat': 22.3072, 'lon': 73.1812, 'state': 'Gujarat'},
            'Kochi': {'lat': 9.9312, 'lon': 76.2673, 'state': 'Kerala'},
            'Thiruvananthapuram': {'lat': 8.5241, 'lon': 76.9366, 'state': 'Kerala'},
            'Visakhapatnam': {'lat': 17.6869, 'lon': 83.2185, 'state': 'Andhra Pradesh'},
            'Vijayawada': {'lat': 16.5062, 'lon': 80.6480, 'state': 'Andhra Pradesh'},
            'Coimbatore': {'lat': 11.0168, 'lon': 76.9558, 'state': 'Tamil Nadu'},
            'Madurai': {'lat': 9.9252, 'lon': 78.1198, 'state': 'Tamil Nadu'},
            'Nashik': {'lat': 19.9975, 'lon': 73.7898, 'state': 'Maharashtra'},
            'Thane': {'lat': 19.2183, 'lon': 72.9781, 'state': 'Maharashtra'},
            'Varanasi': {'lat': 25.3176, 'lon': 82.9739, 'state': 'Uttar Pradesh'},
            'Ghaziabad': {'lat': 28.6692, 'lon': 77.4538, 'state': 'Uttar Pradesh'},
            'Faridabad': {'lat': 28.4089, 'lon': 77.3178, 'state': 'Haryana'},
            'Rajkot': {'lat': 22.3039, 'lon': 70.8022, 'state': 'Gujarat'},
            'Meerut': {'lat': 28.9845, 'lon': 77.7064, 'state': 'Uttar Pradesh'},
            'Kalyan': {'lat': 19.2403, 'lon': 73.1305, 'state': 'Maharashtra'},
            'Vasai-Virar': {'lat': 19.4612, 'lon': 72.7985, 'state': 'Maharashtra'},
            'Aurangabad': {'lat': 19.8762, 'lon': 75.3433, 'state': 'Maharashtra'},
            'Dhanbad': {'lat': 23.7957, 'lon': 86.4304, 'state': 'Jharkhand'},
            'Amritsar': {'lat': 31.6340, 'lon': 74.8723, 'state': 'Punjab'},
            'Allahabad': {'lat': 25.4358, 'lon': 81.8463, 'state': 'Uttar Pradesh'},
            'Prayagraj': {'lat': 25.4358, 'lon': 81.8463, 'state': 'Uttar Pradesh'},
            'Ranchi': {'lat': 23.3441, 'lon': 85.3096, 'state': 'Jharkhand'},
            'Howrah': {'lat': 22.5958, 'lon': 88.2636, 'state': 'West Bengal'},
            'Jabalpur': {'lat': 23.1815, 'lon': 79.9864, 'state': 'Madhya Pradesh'},
            'Gwalior': {'lat': 26.2183, 'lon': 78.1828, 'state': 'Madhya Pradesh'},
            'Chandigarh': {'lat': 30.7333, 'lon': 76.7794, 'state': 'Chandigarh'},
            'Mysore': {'lat': 12.2958, 'lon': 76.6394, 'state': 'Karnataka'},
            'Mysuru': {'lat': 12.2958, 'lon': 76.6394, 'state': 'Karnataka'},
            'Raipur': {'lat': 21.2514, 'lon': 81.6296, 'state': 'Chhattisgarh'},
            'Kota': {'lat': 25.2138, 'lon': 75.8648, 'state': 'Rajasthan'},
            'Bareilly': {'lat': 28.3670, 'lon': 79.4304, 'state': 'Uttar Pradesh'},
            'Jodhpur': {'lat': 26.2389, 'lon': 73.0243, 'state': 'Rajasthan'},
            'Guwahati': {'lat': 26.1445, 'lon': 91.7362, 'state': 'Assam'},
            'Solapur': {'lat': 17.6599, 'lon': 75.9064, 'state': 'Maharashtra'},
            'Hubli-Dharwad': {'lat': 15.3647, 'lon': 75.1240, 'state': 'Karnataka'},
            'Moradabad': {'lat': 28.8389, 'lon': 78.7378, 'state': 'Uttar Pradesh'},
            'Gurgaon': {'lat': 28.4595, 'lon': 77.0266, 'state': 'Haryana'},
            'Gurugram': {'lat': 28.4595, 'lon': 77.0266, 'state': 'Haryana'},
            'Aligarh': {'lat': 27.8974, 'lon': 78.0880, 'state': 'Uttar Pradesh'},
            'Jalandhar': {'lat': 31.3260, 'lon': 75.5762, 'state': 'Punjab'},
            'Noida': {'lat': 28.5355, 'lon': 77.3910, 'state': 'Uttar Pradesh'},
            'Gautam Buddha Nagar': {'lat': 28.5355, 'lon': 77.3910, 'state': 'Uttar Pradesh'},
            'Tiruchirappalli': {'lat': 10.7905, 'lon': 78.7047, 'state': 'Tamil Nadu'},
            'Bhubaneswar': {'lat': 20.2961, 'lon': 85.8245, 'state': 'Odisha'},
            'Salem': {'lat': 11.6643, 'lon': 78.1460, 'state': 'Tamil Nadu'},
            'Warangal': {'lat': 17.9689, 'lon': 79.5941, 'state': 'Telangana'},
            'Guntur': {'lat': 16.3067, 'lon': 80.4365, 'state': 'Andhra Pradesh'},
            'Bhiwandi': {'lat': 19.3009, 'lon': 73.0582, 'state': 'Maharashtra'},
            'Saharanpur': {'lat': 29.9680, 'lon': 77.5552, 'state': 'Uttar Pradesh'},
            'Gorakhpur': {'lat': 26.7606, 'lon': 83.3732, 'state': 'Uttar Pradesh'},
            'Bikaner': {'lat': 28.0229, 'lon': 73.3119, 'state': 'Rajasthan'},
            'Amravati': {'lat': 20.9320, 'lon': 77.7523, 'state': 'Maharashtra'},
            'Noida': {'lat': 28.5355, 'lon': 77.3910, 'state': 'Uttar Pradesh'},
            'Jamshedpur': {'lat': 22.8046, 'lon': 86.2029, 'state': 'Jharkhand'},
            'Bhilai': {'lat': 21.2095, 'lon': 81.3810, 'state': 'Chhattisgarh'},
            'Cuttack': {'lat': 20.4625, 'lon': 85.8828, 'state': 'Odisha'},
            'Firozabad': {'lat': 27.1591, 'lon': 78.3957, 'state': 'Uttar Pradesh'},
            'Kochi': {'lat': 9.9312, 'lon': 76.2673, 'state': 'Kerala'},
            'Ernakulam': {'lat': 9.9312, 'lon': 76.2673, 'state': 'Kerala'},
            'Bhavnagar': {'lat': 21.7645, 'lon': 72.1519, 'state': 'Gujarat'},
            'Dehradun': {'lat': 30.3165, 'lon': 78.0322, 'state': 'Uttarakhand'},
            'Durgapur': {'lat': 23.5204, 'lon': 87.3119, 'state': 'West Bengal'},
            'Asansol': {'lat': 23.6739, 'lon': 86.9524, 'state': 'West Bengal'},
            'Nanded': {'lat': 19.1383, 'lon': 77.3210, 'state': 'Maharashtra'},
            'Kolhapur': {'lat': 16.7050, 'lon': 74.2433, 'state': 'Maharashtra'},
            'Ajmer': {'lat': 26.4499, 'lon': 74.6399, 'state': 'Rajasthan'},
            'Akola': {'lat': 20.7002, 'lon': 77.0082, 'state': 'Maharashtra'},
            'Gulbarga': {'lat': 17.3297, 'lon': 76.8343, 'state': 'Karnataka'},
            'Jamnagar': {'lat': 22.4707, 'lon': 70.0577, 'state': 'Gujarat'},
            'Ujjain': {'lat': 23.1765, 'lon': 75.7885, 'state': 'Madhya Pradesh'},
            'Loni': {'lat': 28.7467, 'lon': 77.2859, 'state': 'Uttar Pradesh'},
            'Siliguri': {'lat': 26.7271, 'lon': 88.3953, 'state': 'West Bengal'},
            'Jhansi': {'lat': 25.4484, 'lon': 78.5685, 'state': 'Uttar Pradesh'},
            'Ulhasnagar': {'lat': 19.2183, 'lon': 73.1382, 'state': 'Maharashtra'},
            'Jammu': {'lat': 32.7266, 'lon': 74.8570, 'state': 'Jammu and Kashmir'},
            'Mangalore': {'lat': 12.9141, 'lon': 74.8560, 'state': 'Karnataka'},
            'Mangaluru': {'lat': 12.9141, 'lon': 74.8560, 'state': 'Karnataka'},
            'Belgaum': {'lat': 15.8497, 'lon': 74.4977, 'state': 'Karnataka'},
            'Belagavi': {'lat': 15.8497, 'lon': 74.4977, 'state': 'Karnataka'},
            'Ambattur': {'lat': 13.1143, 'lon': 80.1548, 'state': 'Tamil Nadu'},
            'Tirunelveli': {'lat': 8.7139, 'lon': 77.7567, 'state': 'Tamil Nadu'},
            'Malegaon': {'lat': 20.5579, 'lon': 74.5287, 'state': 'Maharashtra'},
            'Gaya': {'lat': 24.7955, 'lon': 85.0002, 'state': 'Bihar'},
            'Jalgaon': {'lat': 21.0077, 'lon': 75.5626, 'state': 'Maharashtra'},
            'Udaipur': {'lat': 24.5854, 'lon': 73.7125, 'state': 'Rajasthan'},
            'Maheshtala': {'lat': 22.5093, 'lon': 88.2476, 'state': 'West Bengal'},
        }

census_loader = CensusLoader()
