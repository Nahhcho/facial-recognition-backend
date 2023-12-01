const bodyParser = require('body-parser');
const express = require('express');
const knex = require('knex');
const bcrypt = require('bcrypt-nodejs')
const cors = require('cors')

const db = knex({
    client: 'pg',
    connection: {
        host: 'localhost',
        user: 'postgres',
        password: 'Jc202024',
        database: 'smart-brain-db',
        port: 5432
    }
})

const app = express();

app.use(express.json());
app.use(cors())

app.get('/', (req, res) => {
    res.send('this is working')
})

app.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body
        const hashResult = await db('login').select('hash').where('email', email)

        if(hashResult.length === 0) {
            return res.status(404).json({ 'message': 'User not found!' })
        }

        const hash = hashResult[0].hash

        const passwordMatch = bcrypt.compareSync(password, hash)

        if(passwordMatch) {
            const userResult = await db('users').returning('*').where('email', email)
            const user = userResult[0]
            return res.status(200).json({ 'message': 'Successful login', 'user': user })
        } else {
            return res.status(401).json({ 'message': 'Incorrect password!'})
        }
    }
    catch (error) {
        console.log(`Error: ${error}`)
        return res.status(500).json({ 'message': 'Internal server error'})
    }
})

app.post('/register', async (req, res) => {
    try {
        const { email, name, password } = req.body;

        const emails = await db('users').select('*').where('email', email)
        if(emails.length > 0) {
            return res.status(400).json({ 'message': 'Email already exists' });
        }

        const hash = bcrypt.hashSync(password)

        db.transaction(trx => {
            trx('login')
            .returning('email')
            .insert({
                hash: hash,
                email: email
            })
            .then(returnedEmail => {
                trx('users')
                .returning('*')
                .insert({
                    email: returnedEmail[0].email,
                    name: name
                })
                .then(user => {
                    return res.json({ message: 'User created!', user: user[0]})
                })
            })
        .then(trx.commit)
        .catch(trx.rollback)
        })
    } catch (error) {
        console.log(`Error: ${error}`)
        return res.status(500).json({ 'message': 'Internal server error'})
    }
    
})

app.put('/entry', async (req, res) => {
    try {
        const { email } = req.body

        const userResult = await db('users').returning('*').where('email', email).increment('entries', 1)
        const user = userResult[0]

        console.log(user)

        return res.status(201).json({'message': 'Entries updated!', 'user': user})
    } catch (error) {
        console.log(error)
    }
})

app.listen(process.env.PORT, () => {
    console.log(`app is running on port ${process.env.PORT}`);
})