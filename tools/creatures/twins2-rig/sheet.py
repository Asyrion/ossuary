import sys
from PIL import Image
# sheet.py out cols file...
out, cols, fs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims=[Image.open(f).convert('RGB') for f in fs]; w,h=ims[0].size
rows=(len(ims)+cols-1)//cols
W=Image.new('RGB',(w*cols,h*rows),'white')
for i,im in enumerate(ims): W.paste(im,((i%cols)*w,(i//cols)*h))
W.save(out)
