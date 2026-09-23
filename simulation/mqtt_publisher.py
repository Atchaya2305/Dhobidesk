import os
from pathlib import Path
import paho.mqtt.client as mqtt
import pandas as pd
import json
import time
import ssl

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("'\""))

BROKER = os.getenv("HIVEMQ_BROKER") or os.getenv("HIVEMQ_HOST")
PORT = int(os.getenv("HIVEMQ_PORT", 8883))
USERNAME = os.getenv("HIVEMQ_USERNAME")
PASSWORD = os.getenv("HIVEMQ_PASSWORD")
MACHINE_ID = os.getenv("MACHINE_ID", "machine_01")

if not BROKER or not USERNAME or not PASSWORD:
    raise ValueError(
        "Missing MQTT credentials. Please set HIVEMQ_BROKER, HIVEMQ_USERNAME, and HIVEMQ_PASSWORD in .env or environment."
    )

client = mqtt.Client()
client.username_pw_set(USERNAME, PASSWORD)
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.connect(BROKER, PORT)
client.loop_start()

def publish_state_change(machine_id, state, extra=None):
    payload = {
        "machine_id": machine_id,
        "state": state,
        "timestamp": time.time(),
    }
    if extra:
        payload.update(extra)
    topic = f"dhobidesk/machines/{machine_id}/state"
    client.publish(topic, json.dumps(payload), qos=1)
    print(f"Published: {payload}")

if __name__ == "__main__":
    df = pd.read_csv("../data/classified_top_load.csv")
    last_state = None
    for _, row in df.iterrows():
        if row.predicted_state != last_state:
            publish_state_change(MACHINE_ID, row.predicted_state)
            last_state = row.predicted_state
        time.sleep(0.05)
    client.loop_stop()