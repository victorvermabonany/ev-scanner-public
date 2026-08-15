// Stands in for the Anthropic SDK in the single-file preview build.
//
// A shared preview page is served under a strict content-security policy that
// blocks requests to any other host, api.anthropic.com included. Shipping the
// real SDK there would mean downloading ~280 KB on a phone for a call that
// cannot succeed, and then failing with a network error that blames the
// user's key.
//
// So the preview aliases the SDK to this, which fails immediately and says
// why. generate.js catches it, shows the message, and plans the week from the
// built-in recipe bank — the same path as having no key at all.

export default class AnthropicUnavailable {
  constructor() {
    throw new Error(
      "This shared preview can't reach the Anthropic API, so recipes come from " +
        'the built-in collection. Run the app locally to use your own key.'
    );
  }
}
