/* Augment Cloudflare Env with optional PRIVATE_KEY for wallet tools */
declare global {
	interface Env {
		PRIVATE_KEY?: string;
	}
}

export {};
