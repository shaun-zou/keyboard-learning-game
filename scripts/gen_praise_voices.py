# 生成找键位闯关的 6 句英语夸奖真人语音（微软神经网络语音，免费）
# 用法：python scripts/gen_praise_voices.py [--force]  （--force 全量重新生成）
# 默认跳过已存在且大于 1KB 的文件；每次请求间隔 2.5 秒，429 限流时退避重试
import asyncio
import os
import sys
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
    "unbelievable": "Unbelievable!",
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

GAP = 2.5          # 每次请求之间的间隔（秒），避免触发限流
RETRY_DELAYS = [5, 10, 20]  # 429 限流时的退避重试等待


def usable(path):
    """文件已存在且大于 1KB 视为有效（跳过）"""
    return os.path.exists(path) and os.path.getsize(path) > 1024


async def gen(text, voice, rate, pitch, path, label):
    if usable(path) and not FORCE:
        print(f"SKIP  {label}  (已存在)")
        return
    for attempt, wait in enumerate([0] + RETRY_DELAYS):
        if wait:
            print(f"  限流/失败，{wait}s 后重试（第 {attempt}/{len(RETRY_DELAYS)} 次）…")
            await asyncio.sleep(wait)
        try:
            tts = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await tts.save(path)
            size = os.path.getsize(path) // 1024
            print(f"OK  {label}  ({size} KB)  <- {text}")
            break
        except Exception as e:
            if attempt >= len(RETRY_DELAYS):
                raise
            print(f"  {type(e).__name__}: {str(e)[:80]}")
        await asyncio.sleep(GAP)


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, text in PHRASES.items():
        path = os.path.abspath(os.path.join(OUT_DIR, name + ".mp3"))
        await gen(text, VOICE, RATE, PITCH, path, f"praise/{name}.mp3")

    os.makedirs(CHEER_DIR, exist_ok=True)
    for name, (text, voice, rate, pitch) in CHEER_PHRASES.items():
        path = os.path.abspath(os.path.join(CHEER_DIR, name + ".mp3"))
        await gen(text, voice, rate, pitch, path, f"cheer/{name}.mp3")

    os.makedirs(LETTER_DIR, exist_ok=True)
    for letter in LETTERS:
        path = os.path.abspath(os.path.join(LETTER_DIR, letter + ".mp3"))
        await gen(letter.upper(), VOICE, RATE, PITCH, path, f"letters/{letter}.mp3")
    print(f"OK  letters/*.mp3  x{len(LETTERS)}")


if __name__ == "__main__":
    FORCE = "--force" in sys.argv
    asyncio.run(main())
