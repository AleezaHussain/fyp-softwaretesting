import os
import requests

def log_chat_history(data):
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase URL or Service Key not set!")
        return None
    url = f"{SUPABASE_URL}/rest/v1/chat_history"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    resp = requests.post(url, headers=headers, json=data)
    try:
        return resp.json()
    except Exception:
        return None
