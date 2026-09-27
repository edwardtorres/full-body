// Deterministic release artwork. Run: swift scripts/generate-assets.swift
import AppKit

let output = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("public")
func color(_ red: Int, _ green: Int, _ blue: Int, _ alpha: CGFloat = 1) -> NSColor {
  NSColor(calibratedRed: CGFloat(red) / 255, green: CGFloat(green) / 255, blue: CGFloat(blue) / 255, alpha: alpha)
}
let ink = color(18, 48, 51)
let teal = color(39, 125, 127)
let paper = color(245, 243, 238)
let bone = color(222, 232, 221)

func drawText(_ value: String, x: CGFloat, y: CGFloat, size: CGFloat, weight: NSFont.Weight, shade: NSColor, spacing: CGFloat = 0) {
  let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: size, weight: weight),
    .foregroundColor: shade,
    .kern: spacing,
  ]
  NSAttributedString(string: value, attributes: attributes).draw(at: NSPoint(x: x, y: y))
}
func line(_ points: [NSPoint], shade: NSColor, width: CGFloat) {
  let path = NSBezierPath()
  path.move(to: points[0])
  for point in points.dropFirst() { path.line(to: point) }
  path.lineWidth = width
  shade.setStroke()
  path.stroke()
}
func fillPath(_ points: [NSPoint], shade: NSColor) {
  let path = NSBezierPath()
  path.move(to: points[0])
  for point in points.dropFirst() { path.line(to: point) }
  path.close()
  shade.setFill()
  path.fill()
}
func rounded(_ rect: NSRect, radius: CGFloat, shade: NSColor) {
  shade.setFill()
  NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}
func ellipse(_ rect: NSRect, shade: NSColor) {
  shade.setFill()
  NSBezierPath(ovalIn: rect).fill()
}
func writePNG(width: Int, height: Int, name: String, draw: () -> Void) {
  let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8,
                                samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  let context = NSGraphicsContext(bitmapImageRep: bitmap)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context
  context.imageInterpolation = .high
  draw()
  context.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()
  try! bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(name))
}

// Social card uses the app's off-white/ink/teal palette and a deliberately
// simplified front-facing body map, rather than a simulated product screenshot.
writePNG(width: 1200, height: 630, name: "social-preview.png") {
  paper.setFill(); NSRect(x: 0, y: 0, width: 1200, height: 630).fill()
  color(231, 238, 232).setFill(); NSBezierPath(ovalIn: NSRect(x: 610, y: 1, width: 570, height: 620)).fill()
  color(205, 223, 215).setStroke()
  for radius: CGFloat in [206, 255, 303] {
    let circle = NSBezierPath(ovalIn: NSRect(x: 875 - radius, y: 316 - radius, width: radius * 2, height: radius * 2))
    circle.lineWidth = 1; circle.stroke()
  }
  line([NSPoint(x: 82, y: 563), NSPoint(x: 1118, y: 563)], shade: color(197, 214, 205), width: 1)
  line([NSPoint(x: 82, y: 80), NSPoint(x: 1118, y: 80)], shade: color(197, 214, 205), width: 1)
  drawText("TRAINING / ANATOMY", x: 84, y: 576, size: 13, weight: .bold, shade: teal, spacing: 2.4)
  drawText("FULL", x: 76, y: 346, size: 114, weight: .heavy, shade: ink, spacing: -8)
  drawText("BODY", x: 76, y: 230, size: 114, weight: .heavy, shade: ink, spacing: -8)
  rounded(NSRect(x: 84, y: 162, width: 56, height: 5), radius: 2, shade: teal)
  drawText("3D Dumbbell Workout Tracker", x: 84, y: 110, size: 24, weight: .medium, shade: color(52, 91, 89), spacing: -0.5)
  drawText("MOVE WITH PURPOSE", x: 914, y: 105, size: 11, weight: .bold, shade: teal, spacing: 1.4)

  // Figure: head, shoulders, arms, torso, and legs use separate contours.
  ellipse(NSRect(x: 836, y: 464, width: 69, height: 85), shade: ink)
  rounded(NSRect(x: 850, y: 448, width: 41, height: 38), radius: 13, shade: ink)
  fillPath([NSPoint(x: 799,y: 443), NSPoint(x: 845,y: 456), NSPoint(x: 896,y: 456), NSPoint(x: 942,y: 443), NSPoint(x: 951,y: 386), NSPoint(x: 914,y: 358), NSPoint(x: 905,y: 282), NSPoint(x: 835,y: 282), NSPoint(x: 826,y: 358), NSPoint(x: 789,y: 386)], shade: ink)
  fillPath([NSPoint(x: 799,y: 439), NSPoint(x: 784,y: 431), NSPoint(x: 760,y: 349), NSPoint(x: 752,y: 266), NSPoint(x: 770,y: 261), NSPoint(x: 793,y: 340), NSPoint(x: 817,y: 402)], shade: ink)
  fillPath([NSPoint(x: 940,y: 439), NSPoint(x: 957,y: 431), NSPoint(x: 981,y: 349), NSPoint(x: 990,y: 266), NSPoint(x: 972,y: 261), NSPoint(x: 948,y: 340), NSPoint(x: 925,y: 402)], shade: ink)
  fillPath([NSPoint(x: 839,y: 291), NSPoint(x: 869,y: 293), NSPoint(x: 862,y: 153), NSPoint(x: 843,y: 115), NSPoint(x: 820,y: 118), NSPoint(x: 821,y: 154)], shade: ink)
  fillPath([NSPoint(x: 871,y: 293), NSPoint(x: 902,y: 291), NSPoint(x: 922,y: 154), NSPoint(x: 921,y: 118), NSPoint(x: 898,y: 115), NSPoint(x: 879,y: 153)], shade: ink)
  fillPath([NSPoint(x: 816,y: 421), NSPoint(x: 863,y: 433), NSPoint(x: 866,y: 393), NSPoint(x: 832,y: 383)], shade: teal)
  fillPath([NSPoint(x: 878,y: 433), NSPoint(x: 926,y: 421), NSPoint(x: 909,y: 383), NSPoint(x: 875,y: 393)], shade: teal)
  fillPath([NSPoint(x: 837,y: 372), NSPoint(x: 867,y: 378), NSPoint(x: 867,y: 295), NSPoint(x: 843,y: 301)], shade: bone)
  fillPath([NSPoint(x: 874,y: 378), NSPoint(x: 904,y: 372), NSPoint(x: 898,y: 301), NSPoint(x: 874,y: 295)], shade: bone)
  line([NSPoint(x: 870,y: 435), NSPoint(x: 870,y: 296)], shade: color(162,198,186), width: 2)
  for y: CGFloat in [358, 339, 320] { line([NSPoint(x: 842,y:y), NSPoint(x: 897,y:y)], shade: color(150,188,177), width: 1) }
  ellipse(NSRect(x: 865, y: 411, width: 10, height: 10), shade: color(245, 243, 238))
  line([NSPoint(x: 980,y: 411), NSPoint(x: 1073,y: 411)], shade: teal, width: 1.5)
  ellipse(NSRect(x: 974,y: 406,width: 9,height: 9), shade: teal)
  drawText("CHEST", x: 993, y: 422, size: 10, weight: .bold, shade: teal, spacing: 1.1)
}

for size in [64, 180] {
  writePNG(width: size, height: size, name: size == 64 ? "favicon-64.png" : "apple-touch-icon.png") {
    let scale = CGFloat(size) / 64
    let transform = AffineTransform(scale: scale)
    (NSAffineTransform(transform: transform)).concat()
    rounded(NSRect(x: 0, y: 0, width: 64, height: 64), radius: 15, shade: ink)
    ellipse(NSRect(x: 26, y: 43, width: 12, height: 13), shade: bone)
    rounded(NSRect(x: 27, y: 34, width: 10, height: 12), radius: 3, shade: bone)
    fillPath([NSPoint(x: 18,y: 40),NSPoint(x: 27,y: 44),NSPoint(x: 37,y: 44),NSPoint(x: 46,y: 40),NSPoint(x: 43,y: 28),NSPoint(x: 37,y: 25),NSPoint(x: 38,y: 15),NSPoint(x: 34,y: 7),NSPoint(x: 30,y: 7),NSPoint(x: 26,y: 15),NSPoint(x: 27,y: 25),NSPoint(x: 21,y: 28)], shade: bone)
    fillPath([NSPoint(x: 19,y: 39),NSPoint(x: 15,y: 37),NSPoint(x: 11,y: 25),NSPoint(x: 15,y: 23),NSPoint(x: 23,y: 34)], shade: bone)
    fillPath([NSPoint(x: 45,y: 39),NSPoint(x: 49,y: 37),NSPoint(x: 53,y: 25),NSPoint(x: 49,y: 23),NSPoint(x: 41,y: 34)], shade: bone)
    fillPath([NSPoint(x: 24,y: 35),NSPoint(x: 31,y: 38),NSPoint(x: 31,y: 29),NSPoint(x: 26,y: 27)], shade: teal)
    fillPath([NSPoint(x: 33,y: 38),NSPoint(x: 40,y: 35),NSPoint(x: 38,y: 27),NSPoint(x: 33,y: 29)], shade: teal)
  }
}
