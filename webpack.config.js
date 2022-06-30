const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    watch: './src/client/watch.ts',
    control: './src/client/control.ts',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          configFile: "tsconfig.client.json",
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: './[name].js',
  },
}
