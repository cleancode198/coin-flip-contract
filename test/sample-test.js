const { assert } = require("chai");
const Greeter = artifacts.require("Greeter");

contract.skip("Greeter", accounts => {

  it("Should return the new greeting once it's changed", async () => {
    let greeter = await Greeter.new("Truffle tests");

    let greet = await greeter.greet();
    assert(greet == "Truffle tests");

    await greeter.setGreeting("New greet");
    let newGreet = await greeter.greet();
    assert(newGreet == "New greet");
  });

});

