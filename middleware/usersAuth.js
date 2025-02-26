const { compareSync } = require('bcrypt')
const User = require('../model/userSchema')

const logedin = async (req, res, next) => {
    try {
        if (!req.session.user) {
            res.redirect('/login')
            
        }
        else next()

    } catch (error) {
        console.log(error)
    }
}
const logedout = async (req, res, next) => {
    try {
        if (req.session.user) {
            res.redirect('/')
        }
        else next()

    } catch (error) {
        console.log(error)
    }
}

const isBlocked = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user._id)
        if (user.isBlocked) {
            res.redirect('/logout')
        }
        else next()
    } catch (error) {

    }

}

module.exports = {
    logedin,
    logedout,
    isBlocked

}