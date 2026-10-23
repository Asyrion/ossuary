--[[ The Aseprite side of tools/aseprite/redraw.py, run headless:
  Aseprite -b --script-param mode=<mode> --script-param ... --script tools/aseprite/sprite.lua

  mode=build  data=<grid.txt> out=<file.aseprite>   an indexed sprite from a grid file (below), index 0 transparent
  mode=dump   src=<file.aseprite> data=<grid.txt>   a sprite's palette and pixels (flattened) to a grid file
  mode=export src=<file.aseprite> png=<file.png> big=<file@8x.png> scale=<n>
                                                    the PNG at its size, and a copy `scale` times larger, nearest

  A grid file: "W H", then the palette's size N, then N lines "r g b a", then H lines of W palette indices. ]]
local p = app.params
local mode = p.mode

local function readGrid(path)
  local f = assert(io.open(path, "r"), "cannot read " .. path)
  local nums = {}
  for n in f:read("a"):gmatch("%-?%d+") do nums[#nums + 1] = tonumber(n) end
  f:close()
  local k = 0
  local function nxt() k = k + 1; return nums[k] end
  local w, h, n = nxt(), nxt(), nxt()
  local pal = {}
  for i = 1, n do pal[i] = { nxt(), nxt(), nxt(), nxt() } end
  local px = {}
  for i = 1, w * h do px[i] = nxt() end
  return w, h, pal, px
end

if mode == "build" then
  local w, h, pal, px = readGrid(p.data)
  local spr = Sprite(w, h, ColorMode.INDEXED)
  local P = Palette(#pal)
  for i, c in ipairs(pal) do P:setColor(i - 1, Color { r = c[1], g = c[2], b = c[3], a = c[4] }) end
  spr:setPalette(P)
  spr.transparentColor = 0
  local img = spr.cels[1].image
  for y = 0, h - 1 do
    for x = 0, w - 1 do img:drawPixel(x, y, px[y * w + x + 1]) end
  end
  spr:saveAs(p.out)
  spr:close()
elseif mode == "dump" then
  local spr = app.open(p.src)
  assert(spr.colorMode == ColorMode.INDEXED, p.src .. " is not indexed")
  local img = Image(spr.spec)
  img:clear(spr.transparentColor)
  img:drawSprite(spr, 1)
  local pal = spr.palettes[1]
  local f = assert(io.open(p.data, "w"))
  f:write(spr.width, " ", spr.height, "\n", #pal, "\n")
  for i = 0, #pal - 1 do
    local c = pal:getColor(i)
    f:write(c.red, " ", c.green, " ", c.blue, " ", c.alpha, "\n")
  end
  for y = 0, spr.height - 1 do
    local row = {}
    for x = 0, spr.width - 1 do row[#row + 1] = tostring(img:getPixel(x, y)) end
    f:write(table.concat(row, " "), "\n")
  end
  f:close()
  spr:close()
elseif mode == "export" then
  local spr = app.open(p.src)
  spr:saveCopyAs(p.png)
  if p.big then
    app.activeSprite = spr
    local s = tonumber(p.scale or "8")
    app.command.SpriteSize { ui = false, width = spr.width * s, height = spr.height * s, method = "nearest" }
    spr:saveCopyAs(p.big)
  end
  spr:close()
else
  error("unknown mode " .. tostring(mode))
end
