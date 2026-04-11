import os, re; p=re.compile(r'[𐀀-􏿿]'); print('
'.join(f'{r}/{f}' for r, d, files in os.walk('.') for f in files if f.endswith('.html') and p.search(open(os.path.join(r,f), encoding='utf-8').read())))