import httpx
import asyncio

async def main():
    token = "eyJ0eXAiOiJKV1QiLCJvcmlnaW4iOiJFYXJ0aGRhdGEgTG9naW4iLCJzaWciOiJlZGxqd3RwdWJrZXlfb3BzIiwiYWxnIjoiUlMyNTYifQ.eyJ0eXBlIjoiVXNlciIsInVpZCI6InByYW5qYWxzYWlsd2FsIiwiZXhwIjoxNzkzNzU0MzU4LCJpYXQiOjE3ODg1NzAzNTgsImlzcyI6Imh0dHBzOi8vdXJzLmVhcnRoZGF0YS5uYXNhLmdvdiIsImlkZW50aXR5X3Byb3ZpZGVyIjoiZWRsX29wcyIsImFjciI6ImVkbCIsImFzc3VyYW5jZV9sZXZlbCI6M30.s_yy3k_LApYSulKMD8VRDdVCdnTUi45Rtk3w_8NwalROGP9Eoik_Yrmc3_Z6_YeIZofXLjesrBDzEUGWVF7s9_pXTv0_6zRPYcfMfVNxPnjgaHSyNReeCzXD7WvWUoEJFzb1lpk41p3YRgm5v_WRl_SUgFibxT9lzG5OTxX4ltBOGCOfknPcLWUHeA7ZI-47i1u7Yb5d2XIGeG1Q_YLu1mKqnLkFWDvU-y8EXOd0s83qoxVqj-GfszGTqlBYLTkJPm39271PGa9pu3rJ8q1WdZVG7FCG3SlKIS9wW1-X9hll2Y3lhR1v3K7XnZrXApZPJdnIRJs5VLOFsbPxtLd0Pw"
    ogd_key = "579b464db66ec23bdd000001b70b671d62ca4e6a675636819ddfe248"
    
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        # Test Earthdata token against NASA CMR (correct way to use Bearer JWT)
        print("=== Earthdata via NASA CMR ===")
        r = await client.get(
            "https://cmr.earthdata.nasa.gov/search/granules.json",
            params={"short_name": "VIIRS_SNPP_CLD_L1", "page_size": 1},
            headers={"Authorization": f"Bearer {token}"},
        )
        print(f"CMR Status: {r.status_code} {r.text[:200]}")
        
        # Test Earthdata token against Earthdata /profile  
        print("\n=== Earthdata Profile ===")
        r2 = await client.get(
            "https://urs.earthdata.nasa.gov/profile",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        print(f"Profile Status: {r2.status_code} {r2.text[:200]}")
        
        # data.gov.in with different resource (simpler one)
        print("\n=== data.gov.in alternate resource ===")
        # Try the catalog search instead  
        r3 = await client.get(
            "https://data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69",
            params={"api-key": ogd_key, "format": "json", "limit": 1},
            timeout=30.0,
        )
        print(f"OGD Status: {r3.status_code} {r3.text[:300]}")
        
asyncio.run(main())
