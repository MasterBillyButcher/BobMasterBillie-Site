#!/usr/bin/env python3
"""Strip emoji characters from commands-data.ts (icons unused, desc strings cleaned)."""
import re

path = '/home/z/my-project/src/lib/commands-data.ts'

emoji_pattern = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U00002B00-\U00002BFF"
    "\U0001F000-\U0001F0FF"
    "\U00002190-\U000021FF"
    "\U0000FE00-\U0000FE0F"
    "\U0000200D"
    "]+"
)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

cleaned = emoji_pattern.sub('', content)
# tidy double/trailing spaces left behind before quotes or punctuation
cleaned = re.sub(r"[ \t]+(['\"])", r"\1", cleaned)          # trailing space before closing quote
cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)                 # collapse doubles

with open(path, 'w', encoding='utf-8') as f:
    f.write(cleaned)

print('cleaned', path)
