export function log(tag: string, payload: any) {
  try {
    console.log(`[${tag}]`, JSON.stringify(payload));
  } catch {
    console.log(`[${tag}]`, payload);
  }
}

