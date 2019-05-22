/* The structure of a role document in MongoDB
{
    user: <user_id>,
    roles: {
        <role>: [<scope>, ...]
    }
}
*/
const MongoClient = require('mongodb').MongoClient;

class MongoDbConnector {
    constructor(connect, db, table = 'bifrost_roles') {
        // Flag to determine if the db is ready to be operated upon
        this.ready = false;
        this.connectObj = connect;
        this.db = db;
        this.table = table;
        
        this._mongo = new MongoClient(this.connectObj, { useNewUrlParser: true });
        this._db = null; // MongoDB db instance
        this._rolesCollection = null; // The roles collection instance
    }
    
    /**
     * Connects to the database
     * @returns {Promise} Resolves to `this`
     */
    connect() {
        return new Promise((resolve, reject) => {
            this._mongo.connect((err, mongo) => {
                if (err) return reject(err);
                this.ready = true;
                
                try {
                    this._db = mongo.db();
                } catch (error) {
                    // This will run if db isn't specified in the conenction url
                    if (!this.db) {
                        return reject('Please specify a `db` parameter when initilizing this class.');
                    }
                    this._db = mongo.db(this.db);
                }                
                
                try {
                    this._rolesCollection = this._db.collection(this.table);
                } catch (error) {
                    return reject(error);
                }
                
                resolve(this);
            });
        });
    }

    /**
     * Fetches array of roles a user is assigned
     * @param {String} user The username/id
     * @returns {Promise} Resolves to array on success
     */
    async getRoles(user) {
        this.checkReady();

        var rolesSubdoc = await this.getRolesWithScopes(user);
        return Object.keys(rolesSubdoc);
    }

    /**
     * Fetches the roles sub-document a user is assigned
     * @param {String} user The username/id
     */
    async getRolesWithScopes(user) {
        this.checkReady();
        
        var user = await this._rolesCollection.findOne({ user });
        if (!user) {
            return {};
        }
        return user.roles;
    }

    /**
     * Checks if ready to operate on db. If not, then throws an error.
     */
    checkReady() {
        if (!this.ready) {
            throw new Error('Database is not ready yet. Please connect and wait.');
        }
    }
}

module.exports = MongoDbConnector;
