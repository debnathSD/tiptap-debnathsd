import { Config } from '@remotion/cli/config'

// Screenshots and the rendered video live with the app so the Tour page can serve them.
Config.setPublicDir('../public/tour')
// Three.js needs a real GL backend in headless Chrome.
Config.setChromiumOpenGlRenderer('angle')
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)
Config.setCodec('h264')
Config.setCrf(22)
Config.setPixelFormat('yuv420p')
