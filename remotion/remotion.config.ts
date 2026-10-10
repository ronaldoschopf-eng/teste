import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
// Opcional: usar um Chromium já instalado (ex.: headless_shell) em vez de baixar um
if (process.env.REMOTION_BROWSER) {
	Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
