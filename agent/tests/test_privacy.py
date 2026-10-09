from endpoint_agent.privacy import MAX_APP_NAME_LENGTH, normalize_app_name


def test_normalization_keeps_only_windows_executable_basename() -> None:
    assert normalize_app_name(r"C:\Program Files\Browser\browser.exe") == "browser.exe"


def test_normalization_keeps_only_posix_basename() -> None:
    assert normalize_app_name("/opt/tools/editor") == "editor"


def test_normalization_removes_control_characters_and_bounds_length() -> None:
    value = "a" * (MAX_APP_NAME_LENGTH + 20) + "\n"
    normalized = normalize_app_name(value)
    assert "\n" not in normalized
    assert len(normalized) == MAX_APP_NAME_LENGTH


def test_normalization_rejects_empty_or_non_string_values() -> None:
    assert normalize_app_name("") == "unknown"
    assert normalize_app_name("..") == "unknown"
    assert normalize_app_name(None) == "unknown"
