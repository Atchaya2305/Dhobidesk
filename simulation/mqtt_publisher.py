import paho.mqtt.client as mqtt
import pandas as pd
import json
import time
import ssl

BROKER = "4f4ca661461848b187b3e525a6a81b61.s1.eu.hivemq.cloud"       # e.g. "4f4ca661461848b187b3e525a6a81b61.s1.eu.hivemq.cloud"
PORT = 8883
USERNAME = "dhobidesk-device"
PASSWORD = "dhobideskfypjass"
MACHINE_ID = "machine_01"

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