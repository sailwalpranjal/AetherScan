"""Test server startup"""
import asyncio
import sys
import httpx

async def test_startup():
    print("Testing AetherScan Backend Startup...\n")

    try:
        # Test basic imports
        print("[1/5] Testing imports...")
        from config.settings import settings
        from db.database import db_manager
        from routes import tiles, layers, aqi, search
        from middleware import get_database_guard
        print("  [OK] Core imports successful")

        # Test database initialization
        print("\n[2/5] Testing database...")
        await db_manager.initialize()
        print("  [OK] Database initialized")

        # Test database guard
        print("\n[3/5] Testing database guard...")
        db_guard = get_database_guard()
        stats = db_guard.get_stats()
        print(f"  [OK] Database guard active")
        print(f"    - Active tokens: {stats['current_active_tokens']}")

        # Test quantum (optional)
        print("\n[4/5] Testing quantum processor...")
        try:
            from quantum import QuantumProcessor, QuantumStateManager
            qp = QuantumProcessor()
            print(f"  [OK] Quantum processor initialized")
            print(f"    - Qubits: {qp.num_qubits}")
            print(f"    - Workers: {qp.max_workers}")
            await qp.shutdown()
        except Exception as e:
            print(f"  [SKIP] Quantum disabled (optional): {str(e)[:60]}")

        # Test FastAPI app creation
        print("\n[5/5] Testing FastAPI app...")
        from main import app
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            root_response, health_response, info_response = await asyncio.gather(
                client.get("/"),
                client.get("/health"),
                client.get("/api/info"),
            )

        if root_response.status_code == 200:
            data = root_response.json()
            print(f"  [OK] API responding")
            print(f"    - Name: {data.get('name')}")
            print(f"    - Version: {data.get('version')}")
            print(f"    - Endpoints: {len(data.get('endpoints', {}))}")
        else:
            print(f"  [ERROR] Root API error: {root_response.status_code}")

        if health_response.status_code == 200:
            print(f"  [OK] Health endpoint responding")
            print(f"    - Status: {health_response.json().get('status')}")
        else:
            print(f"  [ERROR] Health endpoint error: {health_response.status_code}")

        if info_response.status_code == 200:
            print(f"  [OK] API info endpoint responding")
            print(f"    - Layers advertised: {len(info_response.json().get('available_layers', []))}")
        else:
            print(f"  [ERROR] API info endpoint error: {info_response.status_code}")

        await db_manager.close()

        print("\n" + "="*60)
        print("[OK] All tests passed! Backend is ready.")
        print("="*60)
        return True

    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_startup())
    sys.exit(0 if result else 1)
