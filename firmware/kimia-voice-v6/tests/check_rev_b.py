"""Static, dependency-light pinout and scope checks for KIMIA Voice V6.

No MCU is flashed; ESPHome's own schema validation runs separately in CI.
"""
from pathlib import Path
import re
import yaml

ROOT=Path(__file__).resolve().parents[1]

class Loader(yaml.BaseLoader):
    pass

def unknown_tag(loader,suffix,node):
    if isinstance(node,yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node,yaml.SequenceNode):
        return loader.construct_sequence(node)
    return loader.construct_mapping(node)

Loader.add_multi_constructor('!',unknown_tag)

def load(path):
    with (ROOT/path).open(encoding="utf-8") as f:
        data=yaml.load(f,Loader=Loader)
    assert isinstance(data,dict),path
    return data

def check():
    entry=load("kimia-voice-proto.yaml")
    core=load("packages/01_core.yaml")
    env=load("packages/02_bme280.yaml")
    listen=load("packages/03_xvf_ecoute_seule.yaml")
    display=load("packages/04_ecran_visage_experimental.yaml")
    assert set(entry["packages"])=={"core","environment","voice_listening"}
    assert core["i2c"]["sda"]=="GPIO5"
    assert core["i2c"]["scl"]=="GPIO6"
    assert core["logger"]["baud_rate"]=="0"
    assert core["esp32"]["flash_size"]=="16MB"
    assert core["psram"]["mode"]=="octal"
    assert listen["i2s_audio"][0]["i2s_lrclk_pin"]=="GPIO7"
    assert listen["i2s_audio"][0]["i2s_bclk_pin"]=="GPIO8"
    assert listen["microphone"][0]["i2s_din_pin"]=="GPIO43"
    assert listen["respeaker_xvf3800"]["address"]=="0x2C"
    assert len(listen["micro_wake_word"]["models"])==1
    assert "nabu" in str(listen["micro_wake_word"]["models"][0]["model"]).lower()
    assert "speaker" not in listen
    assert "media_player" not in listen
    assert "audio_file" not in listen
    assert "sendspin" not in listen
    assert "GPIO44" in (ROOT/"packages/03_xvf_ecoute_seule.yaml").read_text()
    assert env["sensor"][0]["platform"]=="bme280_i2c"
    assert display["spi"][0]["clk_pin"]=="GPIO10"
    assert display["spi"][0]["data_pins"]==["GPIO11","GPIO12","GPIO13","GPIO14"]
    assert display["display"][0]["cs_pin"]=="GPIO15"
    assert display["display"][0]["reset_pin"]=="GPIO16"
    assert display["output"][0]["pin"]=="GPIO17"
    assert display["touchscreen"][0]["reset_pin"]=="GPIO18"
    assert display["touchscreen"][0]["interrupt_pin"]=="GPIO21"
    # Ensure physical XVF single-host warning exists in readme.
    readme=(ROOT/"README.md").read_text(encoding="utf-8")
    assert "XIAO" in readme and "3,3 V" in readme
    print("REV B pin map, XVF listening-only scope, config syntax: OK")

if __name__=="__main__":
    check()
