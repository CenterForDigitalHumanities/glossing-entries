const helloWorld = require("../hello-world.js");

test("returns Hello, World!", () => {
  expect(helloWorld()).toBe("Hello, Fail!");
});
