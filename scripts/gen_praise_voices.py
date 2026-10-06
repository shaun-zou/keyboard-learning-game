# 生成找键位闯关的 6 句英语夸奖真人语音（微软神经网络语音，免费）
# 用法：python scripts/gen_praise_voices.py
import asyncio
import os
import edge_tts

# Aria：热情明亮的美式女声，适合给小朋友的夸奖；语速略快、音调略高更欢快
VOICE = "en-US-AriaNeural"
RATE = "+12%"
PITCH = "+15Hz"

PHRASES = {
    "awesome": "Awesome!",
    "great-job": "Great job!",
    "amazing": "Amazing!",
    "well-done": "Well done!",
    "super-smart": "Super smart!",
    "bullseye": "Bullseye!",
}

# 闯关成功后的中文夸奖（温暖活泼的晓晓女声）
CHEER_PHRASES = {
    "ni-zhen-bang": ("你真棒！", "zh-CN-XiaoxiaoNeural", "+10%", "+20Hz"),
}

# 26 个字母读音（认识键盘模块按键即播，消除 TTS 引擎唤醒延迟）
LETTERS = "abcdefghijklmnopqrstuvwxyz"

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "sounds", "praise")
CHEER_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "sounds", "cheer")
LETTER_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "sounds", "letters")


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, text in PHRASES.items():
        path = os.path.abspath(os.path.join(OUT_DIR, name + ".mp3"))
        tts = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
        await tts.save(path)
        size = os.path.getsize(path) // 1024
        print(f"OK  praise/{name}.mp3  ({size} KB)  <- {text}")

    os.makedirs(CHEER_DIR, exist_ok=True)
    for name, (text, voice, rate, pitch) in CHEER_PHRASES.items():
        path = os.path.abspath(os.path.join(CHEER_DIR, name + ".mp3"))
        tts = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await tts.save(path)
        size = os.path.getsize(path) // 1024
        print(f"OK  cheer/{name}.mp3  ({size} KB)  <- {text}")

    os.makedirs(LETTER_DIR, exist_ok=True)
    for letter in LETTERS:
        path = os.path.abspath(os.path.join(LETTER_DIR, letter + ".mp3"))
        tts = edge_tts.Communicate(letter.upper(), VOICE, rate=RATE, pitch=PITCH)
        await tts.save(path)
    print(f"OK  letters/*.mp3  x{len(LETTERS)}")


if __name__ == "__main__":
    asyncio.run(main())
