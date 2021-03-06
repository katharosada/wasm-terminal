import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'

export default {
  mode: 'development',

  devServer: {
    port: 3000,
    hot: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-site',
    },
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  output: {
    path: path.resolve('dist'),
    publicPath: '/',
    filename: '[name]-[contenthash].js',
    clean: true,
  },

  entry: {
    client: './src/index.ts',
    demo2: './src/demo2.ts',
    python_webworker: {
      import: './src/worker/python-worker.ts',
      filename: 'python-webworker.js'
    }
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            projectReferences: true,
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(svg)|(woff)|(woff2)|(eot)|(ttf)$/,
        use: ['file-loader'],
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './static/index.html',
      chunks: ['client'],
    }),
    new HtmlWebpackPlugin({
      template: './static/demo1.html',
      filename: 'demo1.html',
      chunks: [],
    }),
    new HtmlWebpackPlugin({
      template: './static/demo2.html',
      filename: 'demo2.html',
      chunks: ['demo2'],
    }),


  ],

  devtool: 'cheap-module-source-map',
}
