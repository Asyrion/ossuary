import json,struct,io,sys
from PIL import Image
src,dst,size=sys.argv[1],sys.argv[2],int(sys.argv[3])
d=open(src,'rb').read()
cl,_=struct.unpack('<II',d[12:20]); j=json.loads(d[20:20+cl]); B=20+cl+8
bl,_=struct.unpack('<II',d[20+cl:28+cl]); binc=d[B:B+bl]
repl={}
for im in j['images']:
    v=j['bufferViews'][im['bufferView']]; o=v.get('byteOffset',0); I=Image.open(io.BytesIO(binc[o:o+v['byteLength']])).convert('RGB')
    if I.size[0]>size: I=I.resize((size,size),Image.LANCZOS)
    buf=io.BytesIO(); I.save(buf,'JPEG',quality=92 if 'normal' in im.get('name','').lower() else 88,optimize=True)
    repl[im['bufferView']]=buf.getvalue(); im['mimeType']='image/jpeg'
out=bytearray()
for i,v in enumerate(j['bufferViews']):
    o=v.get('byteOffset',0); data=repl.get(i, binc[o:o+v['byteLength']])
    while len(out)%4: out.append(0)
    v['byteOffset']=len(out); v['byteLength']=len(data); out+=data
while len(out)%4: out.append(0)
j['buffers'][0]['byteLength']=len(out)
js=json.dumps(j,separators=(',',':')).encode()
while len(js)%4: js+=b' '
total=12+8+len(js)+8+len(out)
open(dst,'wb').write(struct.pack('<III',0x46546C67,2,total)+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(out),0x004E4942)+out)
print('written',total)
