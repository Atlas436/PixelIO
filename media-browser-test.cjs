const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
function wav() {
  const size = 320000,
    b = Buffer.alloc(44 + size);
  b.write("RIFF");
  b.writeUInt32LE(36 + size, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(size, 40);
  return b;
}
const youtubeMock = `window.YT={Player:class{
 constructor(frame,{events}){this.frame=frame;this.events=events;this.state=2;this.position=12;this.duration=200;window.testYT=this;queueMicrotask(()=>events.onReady({target:this}));}
 getDuration(){return this.duration}getCurrentTime(){return this.position}getVideoData(){return {title:'Vídeo de teste'}}getPlayerState(){return this.state}
 playVideo(){this.state=1;this.events.onStateChange({data:1})}pauseVideo(){this.state=2;this.events.onStateChange({data:2})}seekTo(time){this.position=time}
 destroy(){this.destroyed=true;this.frame.remove()}nextVideo(){this.next=true}previousVideo(){this.previous=true}
}};window.onYouTubeIframeAPIReady();`;
const spotifyMock = `window.onSpotifyIframeApiReady({createController(element,options,callback){
 const iframe=document.createElement('iframe');iframe.src=options.url.replace('open.spotify.com/','open.spotify.com/embed/');element.replaceWith(iframe);
 const events={};const controller={playing:false,addListener(name,fn){events[name]=fn},resume(){this.playing=true;events.playback_update({data:{isPaused:false,position:12000,duration:200000}})},pause(){this.playing=false;events.playback_update({data:{isPaused:true,position:12000,duration:200000}})},seek(seconds){this.position=seconds},destroy(){this.destroyed=true;iframe.remove()}};
 window.testSpotify=controller;callback(controller);queueMicrotask(()=>events.ready());
}});`;
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript(() => {
      window.mediaActions = {};
      const original = navigator.mediaSession.setActionHandler.bind(
        navigator.mediaSession,
      );
      navigator.mediaSession.setActionHandler = (action, handler) => {
        window.mediaActions[action] = handler;
        original(action, handler);
      };
    });
    await p.route("https://www.youtube.com/iframe_api", (r) =>
      r.fulfill({ contentType: "application/javascript", body: youtubeMock }),
    );
    await p.route("https://www.youtube-nocookie.com/**", (r) =>
      r.fulfill({ contentType: "text/html", body: "<p>Vídeo de teste</p>" }),
    );
    await p.route("https://open.spotify.com/embed/iframe-api/v1", (r) =>
      r.fulfill({ contentType: "application/javascript", body: spotifyMock }),
    );
    await p.route("https://open.spotify.com/embed/track/**", (r) =>
      r.fulfill({ contentType: "text/html", body: "<p>Spotify de teste</p>" }),
    );
    await p.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await p.locator("#start").click();
    await p.locator("#system").waitFor({ state: "visible" });
    await p.locator('.desktop-app[data-app="music"]').dblclick();
    const app = p.locator(".music-app"),
      win = p.locator('.window[data-app="music"]');
    await app.locator("#music-files").setInputFiles([
      { name: "primeira.wav", mimeType: "audio/wav", buffer: wav() },
      { name: "segunda.wav", mimeType: "audio/wav", buffer: wav() },
    ]);
    await p.waitForFunction(
      () => document.querySelector(".music-app audio").readyState >= 1,
    );
    await app.getByRole("button", { name: "Reproduzir", exact: true }).click();
    await p.waitForFunction(
      () => navigator.mediaSession.playbackState === "playing",
    );
    assert.equal(
      await p.evaluate(() => navigator.mediaSession.metadata.title),
      "primeira.wav",
    );
    await win
      .getByRole("button", { name: "Minimizar Música", exact: true })
      .click();
    await p.locator(".media-dock").waitFor({ state: "visible" });
    await p
      .getByRole("button", { name: "Pausar no mini player", exact: true })
      .click();
    assert(await app.locator("audio").evaluate((a) => a.paused));
    await p.evaluate(() => window.mediaActions.play());
    await p.waitForFunction(
      () => !document.querySelector(".music-app audio").paused,
    );
    await p.evaluate(() => window.mediaActions.nexttrack());
    assert.equal(await app.locator(".music-now").textContent(), "segunda.wav");
    await p.getByRole("button", { name: "Abrir Música", exact: true }).click();
    await win.waitFor({ state: "visible" });
    await app.getByRole("tab", { name: "YouTube", exact: true }).click();
    await app
      .locator("#music-link-youtube")
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await app.locator('#music-youtube button[type="submit"]').click();
    await p.waitForFunction(
      () => !!window.testYT && !!window.mediaActions.play,
    );
    await p.evaluate(() => window.mediaActions.play());
    await p.waitForFunction(
      () => navigator.mediaSession.playbackState === "playing",
    );
    assert(await app.locator("audio").evaluate((a) => a.paused));
    await win
      .getByRole("button", { name: "Minimizar Música", exact: true })
      .click();
    await p
      .locator(".media-dock:not(.media-dock-embedded)")
      .waitFor({ state: "visible" });
    assert.equal(await p.locator(".media-dock iframe").count(), 1);
    const frame = await p.locator(".media-dock iframe").elementHandle();
    assert((await p.locator(".media-dock-frame").boundingBox()).height >= 200);
    await p
      .getByRole("button", { name: "Pausar no mini player", exact: true })
      .click();
    assert.equal(await p.evaluate(() => window.testYT.state), 2);
    await p.evaluate(() => window.mediaActions.play());
    assert.equal(await p.evaluate(() => window.testYT.state), 1);
    await p.evaluate(() => window.mediaActions.seekto({ seekTime: 60 }));
    assert.equal(await p.evaluate(() => window.testYT.position), 60);
    await p.getByRole("button", { name: "Abrir Música", exact: true }).click();
    assert(await frame.evaluate((e) => e.isConnected));
    await app.getByRole("tab", { name: "Meus arquivos", exact: true }).click();
    assert(await frame.evaluate((e) => e.isConnected));
    await p
      .locator(".media-dock:not(.media-dock-embedded)")
      .waitFor({ state: "visible" });
    await app.getByRole("tab", { name: "Spotify", exact: true }).click();
    await app
      .locator("#music-link-spotify")
      .fill("https://open.spotify.com/track/0123456789abcdefghijkl");
    await app.locator('#music-spotify button[type="submit"]').click();
    await p.waitForFunction(
      () => !!window.testSpotify && !!window.mediaActions.play,
    );
    assert(await p.evaluate(() => window.testYT.destroyed));
    await p.evaluate(() => window.mediaActions.play());
    await p.waitForFunction(
      () => navigator.mediaSession.playbackState === "playing",
    );
    assert(await p.evaluate(() => window.testSpotify.playing));
    await win
      .getByRole("button", { name: "Minimizar Música", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Pausar no mini player", exact: true })
      .click();
    assert(!(await p.evaluate(() => window.testSpotify.playing)));
    await p.setViewportSize({ width: 360, height: 640 });
    assert((await p.locator(".media-dock").boundingBox()).width <= 336);
    await p.getByRole("button", { name: "Abrir Música", exact: true }).click();
    await win
      .getByRole("button", { name: "Fechar Música", exact: true })
      .click();
    assert.equal(await p.locator(".media-dock").count(), 0);
    assert.equal(
      await p.evaluate(() => navigator.mediaSession.playbackState),
      "none",
    );
    assert(await p.evaluate(() => window.testSpotify.destroyed));
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mini player, Media Session com áudio local real, comandos de YouTube/Spotify via SDKs simulados, vídeo visível, mesmo iframe ao minimizar, mudança de aba, restauração e limpeza.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
