/*global __dirname, require, module*/

const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const path = require('path');
const env  = require('yargs').argv.env;

const srcRoot = path.join(__dirname, '..', 'src');
const nodeRoot = path.join(__dirname, '..', 'node_modules');
const outputPath = path.join(__dirname, '..', 'dist');

let plugins = [];
let outputFile = 'md-preset-converter';

if (env === 'prod') {
  outputFile += '.min';
}

let config = {
  entry: srcRoot + '/index.js',
  devtool: 'source-map',
  output: {
    path: outputPath,
    filename: outputFile + '.js',
    library: 'mdPresetConverter',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /(\.js)$/,
        exclude: /node_modules|lib/,
        use: {
          loader: 'babel-loader?cacheDirectory',
          options: {
            plugins: ['transform-runtime'],
            presets: ['env']
          }
        }
      },
      {
        test: /(\.js)$/,
        exclude: /node_modules|lib/,
        use: {
          loader: 'eslint-loader'
        },
        enforce: 'pre'
      },
    ]
  },
  resolve: {
    modules: [srcRoot, nodeRoot],
    extensions: ['.js']
  },
  plugins: [],
  node: {
    fs: 'empty'
  }
};


if (env === 'prod') {
  config.plugins.push(
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),

    new UglifyJsPlugin()
  );
}

module.exports = config;
