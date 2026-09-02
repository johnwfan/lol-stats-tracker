"""
End-to-end tests against the FastAPI app (in-process, via TestClient --
no separately running server needed). Covers one valid draft and the four
invalid-input cases called out in the Day 6 plan.

Run with: python test_e2e.py  (or: pytest test_e2e.py)
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

VALID_DRAFT = {
    "blue_top": "Aatrox", "blue_jungle": "LeeSin", "blue_mid": "Ahri", "blue_adc": "Jinx", "blue_support": "Thresh",
    "red_top": "Darius", "red_jungle": "Elise", "red_mid": "Zed", "red_adc": "Caitlyn", "red_support": "Lulu",
}


def test_valid_draft():
    resp = client.post("/analyze-draft", json=VALID_DRAFT)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for field in ["raw_score", "z_score", "percentile", "advantage", "confidence", "warnings", "model_version", "reference_population", "disclaimer"]:
        assert field in body, f"missing field: {field}"
    assert 0.0 <= body["raw_score"] <= 1.0
    assert 0.0 <= body["percentile"] <= 100.0
    assert body["advantage"] in {"strong_red", "slight_red", "even", "slight_blue", "strong_blue"}
    assert body["confidence"] in {"low", "very_low"}
    assert body["model_version"] == "draft-logreg-v1"
    print("test_valid_draft PASSED", body)


def test_missing_role():
    bad = {k: v for k, v in VALID_DRAFT.items() if k != "red_support"}
    resp = client.post("/analyze-draft", json=bad)
    assert resp.status_code == 422, resp.text
    print("test_missing_role PASSED", resp.status_code)


def test_duplicate_champion():
    bad = {**VALID_DRAFT, "red_top": VALID_DRAFT["blue_top"]}
    resp = client.post("/analyze-draft", json=bad)
    assert resp.status_code == 400, resp.text
    assert "duplicate" in resp.json()["detail"].lower()
    print("test_duplicate_champion PASSED", resp.json())


def test_unknown_champion():
    bad = {**VALID_DRAFT, "blue_top": "TotallyFakeChampionXYZ"}
    resp = client.post("/analyze-draft", json=bad)
    assert resp.status_code == 400, resp.text
    assert "unknown champion" in resp.json()["detail"].lower()
    print("test_unknown_champion PASSED", resp.json())


def test_malformed_json():
    resp = client.post("/analyze-draft", content=b"{not valid json", headers={"Content-Type": "application/json"})
    assert resp.status_code == 422, resp.text
    print("test_malformed_json PASSED", resp.status_code)


if __name__ == "__main__":
    test_valid_draft()
    test_missing_role()
    test_duplicate_champion()
    test_unknown_champion()
    test_malformed_json()
    print("\nALL TESTS PASSED")
