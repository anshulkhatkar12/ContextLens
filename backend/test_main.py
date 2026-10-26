import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "engine" in data

def test_demo_scenarios():
    response = client.get("/demos")
    assert response.status_code == 200
    data = response.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 3

def test_compare_contradiction():
    payload = {
        "claim_a": {
            "text": "The conference keynote takes place on Friday, November 14.",
            "title": "Source A Daily",
            "url": "https://source-a.example/news"
        },
        "claim_b": {
            "text": "All keynote sessions are scheduled for Saturday, November 15.",
            "title": "Source B Official",
            "url": "https://source-b.example/schedule"
        }
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "possible_contradiction"
    assert len(data["key_differences"]) > 0
    assert len(data["missing_context"]) > 0
    assert len(data["verification_questions"]) > 0

def test_compare_different_context():
    payload = {
        "claim_a": {
            "text": "The laptop starts at $499 on the store listing.",
            "title": "MSRP Specs",
            "url": "https://store.example/laptop"
        },
        "claim_b": {
            "text": "The total order came to $549 at checkout with shipping and taxes.",
            "title": "Buyer Forum",
            "url": "https://forum.example/thread"
        }
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "different_context"
    assert "shipping" in data["explanation"].lower() or "price" in data["explanation"].lower()

def test_compare_insufficient_context():
    payload = {
        "claim_a": {
            "text": "Youth unemployment increased by 3.8% in recent reports.",
            "title": "Macro Report",
            "url": "https://report.example/stat1"
        },
        "claim_b": {
            "text": "Youth joblessness dropped to an all-time low of 7.2%.",
            "title": "Talent Digest",
            "url": "https://digest.example/stat2"
        }
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "insufficient_context"

def test_compare_consistent():
    payload = {
        "claim_a": {
            "text": "The opening keynote takes place on Friday at 9:00 AM.",
            "title": "Source A Daily",
            "url": "https://source-a.example/news"
        },
        "claim_b": {
            "text": "Organizers confirmed that the keynote is scheduled for Friday at 9:00 AM.",
            "title": "Source B Official",
            "url": "https://source-b.example/schedule"
        }
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "consistent"
    assert len(data["key_differences"]) > 0
    assert len(data["verification_questions"]) > 0

def test_compare_museum_weekday_hours():
    payload = {
        "claim_a": {
            "text": "THE MUSEUM IS OPEN FROM 9 TO 5 ON WEEKDAYS",
            "title": "Manual Input",
            "url": ""
        },
        "claim_b": {
            "text": "VISITOR INFORMATION LISTS THE MUSEUM WEEKDAY OPENING FROM 9 TO 5",
            "title": "Manual Input",
            "url": ""
        }
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "consistent"
    assert "museum" in data["explanation"].lower()
    # Confirm no robotic 'Manual Input' text leaked into key differences
    for diff in data["key_differences"]:
        assert "context from: Manual Input" not in diff

def test_empty_text_validation():
    payload = {
        "claim_a": {"text": "   ", "title": "Source A", "url": ""},
        "claim_b": {"text": "Valid text here", "title": "Source B", "url": ""}
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 400

def test_too_short_text_validation():
    payload = {
        "claim_a": {"text": "hi", "title": "Source A", "url": ""},
        "claim_b": {"text": "Valid text here", "title": "Source B", "url": ""}
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 400
