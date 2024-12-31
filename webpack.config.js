module.exports = {
  resolve: {
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false,
      util: require.resolve('util/'),
      assert: require.resolve('assert/')
    }
  }
}; 