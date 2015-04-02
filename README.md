
# monkey-hot-loader

A [webpack](http://webpack.github.io/docs/) loader which adds live
updating functionality to a JavaScript system. View
[this post](http://jlongster.com/Backend-Apps-with-Webpack,-Part-III)
for gory technical details.

## Summary

This loader acts similarly to
[react-hot-loader](http://gaearon.github.io/react-hot-loader/) in that
it uses webpack's HMR infrastructure to be notified when a module has
changed. When it changes, it takes the new module's code and
monkey-patches the live running system automatically, so all you have
to do is **edit a file and save it**.

As described in
[my post](http://jlongster.com/Backend-Apps-with-Webpack,-Part-III),
currently this only supports updating top-level functions in a module.
That means given this code:

```js
function foo() {
  return 5;
}

function bar() {
  return function() { 
    // ...
  }
}

module.exports = function() {
  // ...
}
```

only `foo` and `bar` will update in the live system when changed.
Editing the function within `bar` will reload `bar` entirely; we have
no support for patching arbitrary functions like closures.

Turns out this is still incredibly valuable, and much easier to
rationalize about.

In the future, this could patch methods on classes as well which would
cover the majority of JavaScript code.

## Usage

See [the gulpfile](https://github.com/jlongster/backend-with-webpack/blob/master/gulpfile.js) in `backend-with-webpack` to see a full setup. This is a bit confusing right now. If you check out [backend-with-webpack](https://github.com/jlongster/backend-with-webpack), run `npm install` and `gulp run` you should have a full setup running.

1. Install the loader

```
npm install monkey-hot-loader
```

2. Add the loader to your webpack config, for example:

```js
  module: {
    loaders: [
      {test: /\.js$/, exclude: /node_modules/, loaders: ['monkey-hot', 'babel'] },
    ]
  }
```

3. For the frontend, follow the instructions in [react-hot-loader](http://gaearon.github.io/react-hot-loader/getstarted/) to get `webpack-dev-server` set up.

In your webpack config, add 2 more files to load, which connect and listen to the dev server. Additionally, add the `HotModuleReplacementPlugin` to plugins.

```
var frontendConfig = config({
  entry: [
    'webpack-dev-server/client?http://localhost:3000',
    'webpack/hot/only-dev-server',
    './static/js/main.js'
  ],
  output: {
    ...
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
});
```

4. For the backend, do the same as the frontend except add only `webpack/hot/signal.js` file to your entry point. Also make sure to give a patch to `recordsPath`.

```
var backendConfig = config({
  entry: [
    'webpack/hot/signal.js',
    './src/main.js'
  ],
  target: 'node',
  output: {
    ...
  },
  recordsPath: path.join(__dirname, 'build/_records'),
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
});
```

Now, use nodemon to run your app:

```
nodemon({
  execMap: {
    js: 'node'
  },
  script: path.join(__dirname, 'build/backend'),
  ignore: ['*'],
  watch: ['nothing/'],
  ext: 'noop'
});
```

We tell `nodemon` to watch no files. We only use it to send the SIGUSR2 signal to the app. This part could be greatly improved.

Now, when webpack is done running, call `nodemon.restart()`:

```
webpack(backendConfig).watch(100, function(err, stats) {
  nodemon.restart();
});
```

I bet this is wildly confusing, and this really coule be improved. nodemon issues a restart by sending a SIGUSR2 on the process, but the `webpack/hot/signal.js` file installs code which captures this signal and checks for updated modules. So the restart really is just an update.

I recommend just checking out [backend-with-webpack](https://github.com/jlongster/backend-with-webpack), installing with `npm install` and running with `gulp run` and playing with it there.
