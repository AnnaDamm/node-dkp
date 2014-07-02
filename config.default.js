module.exports = {
    hostname: "www.node-dkp.com",
    port: 50000,
    defaultLanguage: "en",

    cookie: {
        secret: "QEgWmb7f3mZ6niNjLerHNWP8k9xKUW3nDmkPdaH2TmaWbg3TWk2qmE5D98Wo94uDz5GsMetrayoLaU9tghFtNTLyHztEGGHbtsuBtaDz9mzwCmvXYY66JhXzy4cCcYXL",
        maxAge: 2592000000 // one month
    },
    session: {
        secret: "kV9VyNePoc47XimNrG8gY9oQy2f9ZaPGjDKHiKvG7h5sV6h6hSjPqkZ4jRYYCvrdTVXobq3GpBjCGewu6QTPzz9Ev2i8mkUtNgWYUCRa6ZvNuZ9U8zu6i9p8PRL466WF"
    },

    mongo: {
        url: "127.0.0.1:27017/node-dkp"
    },

    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        pass: null
    },

    smtp: {
        host: "localhost",
        port: 587,
        user: "",
        password: "",
        from: "DKP System <no-reply@node-dkp.com>"
    },

    recaptcha: {
        publicKey: "",
        privateKey: ""
    },

    theme: "darkly"
};