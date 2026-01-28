import requests

# 1. Login
login_payload = {
    "username": "admin@dernek.com",
    "password": "123456" # Default demo password
}
base_url = "http://localhost:8000/api/v1"

print("Logging in...")
try:
    resp = requests.post(f"http://localhost:8000/api/v1/auth/token", data=login_payload)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        exit(1)
        
    data = resp.json()
    token = data["access_token"]
    tenant_id = data["tenant"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login success. Tenant ID: {tenant_id}")
    
    # 2. Create Gelir (Income)
    gelir_data = {
        "type": "income",
        "amount": 1000.0,
        "description": "Test Gelir",
        "category_id": "aidat"
    }
    
    print("Creating Gelir...")
    resp = requests.post(f"{base_url}/gelirler/", json=gelir_data, headers=headers)
    if resp.status_code == 201:
        print("✅ Create Gelir Success")
        print(resp.json())
        gelir_id = resp.json()["id"]
    else:
        print(f"❌ Create Gelir Failed: {resp.text}")
        exit(1)
        
    # 3. List Gelirler
    print("Listing Gelirler...")
    resp = requests.get(f"{base_url}/gelirler/", headers=headers)
    items = resp.json()
    found = any(i["id"] == gelir_id for i in items)
    if found:
        print(f"✅ Gelir found in list. Total count: {len(items)}")
    else:
        print("❌ Gelir NOT found in list")
        
    # 4. Dashboard Stats
    print("Checking Dashboard Stats...")
    resp = requests.get(f"{base_url}/dashboard/stats", headers=headers)
    stats = resp.json()
    print("Stats:", stats)
    if stats["aylik_gelir"] >= 1000:
         print("✅ Dashboard stats verify income.")
    else:
         print("❌ Dashboard stats verification failed.")

except Exception as e:
    print(f"Error: {e}")
