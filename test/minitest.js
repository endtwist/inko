var sys = require("sys");
var colours = {
  reset: "\x1B[0m",

  grey:    "\x1B[0;30m",
  red:     "\x1B[0;31m",
  green:   "\x1B[0;32m",
  yellow:  "\x1B[0;33m",
  blue:    "\x1B[0;34m",
  magenta: "\x1B[0;35m",
  cyan:    "\x1B[0;36m",
  white:   "\x1B[0;37m",

  bold: {
    grey:    "\x1B[1;30m",
    red:     "\x1B[1;31m",
    green:   "\x1B[1;32m",
    yellow:  "\x1B[1;33m",
    blue:    "\x1B[1;34m",
    magenta: "\x1B[1;35m",
    cyan:    "\x1B[1;36m",
    white:   "\x1B[1;37m",
  }
};

/* suite */
function Suite () {
  this.contexts = [];
};

Suite.prototype.report = function () {
  var suite = this;
  this.contexts.forEach(function(context, index) {
    sys.puts(context.contextHeader());
    context.report();
    if (suite.contexts.length === index) {
      sys.puts("");
    };
  });
};

Suite.prototype.register = function (context) {
  this.contexts.push(context);
};

// there is only one suite instance
var suite = exports.suite = new Suite();

/* context */
function Context (description, block) {
  this.tests = [];
  this.block = block;
  this.description = description;
};

Context.prototype.run = function () {
  this.block.call(this);
};

Context.prototype.register = function (test) {
  this.tests.push(test);
};

Context.prototype.report = function () {
  var results = {pass: 0, fail: 0, unfinished: 0};
  this.tests.forEach(function (test) {
    var res = test.report();
    if(res == 1) results.pass++;
    else if(res == 0) results.fail++;
    else if(res == -1) results.unfinished++;
  });
  
  sys.puts(colours.green + results.pass + ' tests passed; ' +
           colours.red + results.fail + ' tests failed; ' +
           colours.magenta + results.unfinished + ' tests didn\'t finish');
};

/* test */
function Test (description, block, setupBlock) {
  this.description = description;
  this.block = block;
  this.setupBlock = setupBlock;
};

Test.prototype.run = function () {
  try {
    if (this.setupBlock) {
      this.setupBlock.call(this);
    };

    this.block.call(this, this);
  } catch(error) {
    this.failed(error);
  };
};

Test.prototype.finished = function () {
  this.result = this.reportSuccess();
  this.resultBool = true;
};

Test.prototype.failed = function (error) {
  this.result = this.reportError(error);
  this.resultBool = false;
};

Test.prototype.report = function () {
  if (this.result) {
    sys.puts(this.result);
    return this.resultBool;
  } else {
    sys.puts(this.reportNotFinished());
    return -1;
  };
};

/* output formatters */
Context.prototype.contextHeader = function () {
  return colours.bold.yellow + "[= " + this.description + " =]" + colours.reset;
};

Test.prototype.reportSuccess = function () {
  return colours.bold.green + "  ✔ OK: " + colours.reset + this.description;
};

Test.prototype.reportError = function (exception) {
  var error = exception.stack ? exception.stack : exception;
  var error = error.toString().replace(/^/, "    ");
  if (this.description) {
    return colours.bold.red + "  ✖ Error: " + colours.reset + this.description + "\n" + error;
  } else {
    return colours.bold.red + "  ✖ Error: " + colours.reset + "\n" + error;
  };
};

Test.prototype.reportNotFinished = function () {
  return colours.bold.magenta + "  ✖ Didn't finish: " + colours.reset + this.description;
};

/* DSL */
function context (description, block) {
  var context = new Context(description, block);
  suite.register(context);
  context.run();
};

/*
  Run an example and print if it was successful or not.

  @example
    minitest.context("setup()", function () {
      this.assertion("Default value should be 0", function (test) {
        assert.equal(value, 0);
        test.finished();
      });
    });
*/
Context.prototype.assertion = function (description, block) {
  var test = new Test(description, block, this.setupBlock);
  this.register(test);
  test.run();
};

Context.prototype.setup = function (block) {
  this.setupBlock = block;
};

function runAtExit () {
  if(!process.listeners('exit').length) {
      process.addListener("exit", function () {
        suite.report();
      });
  }
};

function setupUncaughtExceptionListener () {
  // TODO: is there any way how to get the test instance,
  // so we could just set test.result, so everything would be
  // reported properly on the correct place, not in the middle of tests
  process.addListener("uncaughtException", function (error) {
    sys.puts(Test.prototype.reportError(error));
  });
};

function setupListeners () {
  setupUncaughtExceptionListener();
  runAtExit();
};

/* exports */
exports.Context = Context;
exports.Test = Test;
exports.context = context;
exports.runAtExit = runAtExit;
exports.setupUncaughtExceptionListener = setupUncaughtExceptionListener;
exports.setupListeners = setupListeners;
