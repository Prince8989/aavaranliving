// Minimal local stand-in for the Stripe API, used only by end-to-end tests
// (the sandbox has no network access to api.stripe.com). It returns a Checkout
// Session whose URL is our own success page, so the browser flow can be exercised.
import http from "node:http";

let n = 0;
http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.method === "POST" && req.url?.startsWith("/v1/checkout/sessions")) {
        const params = new URLSearchParams(body);
        n += 1;
        const id = `cs_test_e2e_${Date.now()}_${n}`;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id, object: "checkout.session", url: params.get("success_url"), metadata: { orderId: params.get("metadata[orderId]") } }));
        return;
      }
      if (req.url === "/health") {
        res.writeHead(200);
        res.end("ok");
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not mocked" } }));
    });
  })
  .listen(12111, () => console.log("stripe mock on 12111"));
