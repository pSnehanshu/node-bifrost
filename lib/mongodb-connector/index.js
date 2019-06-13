/* The structure of a role document in MongoDB
{
    user: <user_id>,
    roles: {
        <role>: [<scope>, ...]
    }
}

The structure of hierarchy document in MongoDB
{
    parent: <parentScope>,
    child: <childScope>
}
*/
const MongoClient = require('mongodb').MongoClient;
const arrayUnique = require('../utils/arrayUnique');

class MongoDbConnector {
    constructor(connect, db, rolesTable = 'bifrost_roles', scopesTable = 'bifrost_scopes_hierarchy') {
        // Flag to determine if the db is ready to be operated upon
        this.ready = false;
        this.connectObj = connect;
        this.db = db;
        this.rolesTable = rolesTable;
        this.scopesTable = scopesTable;

        this._mongo = new MongoClient(this.connectObj, { useNewUrlParser: true });
        this._db = null; // MongoDB db instance
        this._rolesCollection = null; // The roles collection instance
        this._scopesCollection = null; // The scopes hierarchy collection instance
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
                    this._rolesCollection = this._db.collection(this.rolesTable);
                    this._scopesCollection = this._db.collection(this.scopesTable);
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
     * Adds an user along with roles and scope. It's idempotent, i.e. It creates if
     * not exists. Otherwise it updates an existing record.
     * @param {String} user 
     * @param {Object} roles Keys specify role, and every role is an array of associated scopes
     * @returns Promise which resolves to the updated set of roles object
     */
    async addUserRoles(user, roles = {}) {
        this.checkReady();

        roles = mergeRolesObj(await this.getRolesWithScopes(user), roles);
        // Now upsert the user
        var result = await this._rolesCollection.updateOne({ user }, { $set: { roles } }, { upsert: true });

        // Check if successful
        if (result.result.ok !== 1) {
            throw new Error('Failed to create user');
        }
        return roles;
    }

    /**
     * Get direct children scopes (not indirect) for a given scope. Promise resolves to array of children
     * @param {String} scope The scope for which direct children are required
     */
    getDirectChildrenScopes(scope) {
        this.checkReady();

        return new Promise((resolve, reject) => {
            this._scopesCollection.find({ parent: scope }).toArray((err, result) => {
                if (err) return reject(err);

                var children = [];
                result.forEach(r => r.child && children.push(r.child));
                resolve(arrayUnique(children));
            });
        });
    }

    /**
     * Get direct parent scopes (not indirect) for a given scope. Promise resolves to array of parents
     * @param {String} scope The scope for which direct parents are required
     */
    getDirectParentScopes(scope) {
        this.checkReady();

        return new Promise((resolve, reject) => {
            this._scopesCollection.find({ child: scope }).toArray((err, result) => {
                if (err) return reject(err);

                var parents = [];
                result.forEach(r => r.parent && parents.push(r.parent));
                resolve(arrayUnique(parents));
            });
        });
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

//

/**
 * Merges roles object (which includes array of scopes)
 * @param {Object} existing The existing roles object
 * @param {Object} others The new roles object to be merged
 * @returns {Object} The merged object
 */
function mergeRolesObj(existing, others) {
    // Cloning the `existing` object
    var _existing = Object.assign({}, existing);

    // The actual loop that does merging
    for (role in others) {
        if (!others.hasOwnProperty(role)) continue;

        // If the role already doesn't exists, then create it.
        if (!_existing.hasOwnProperty(role)) _existing[role] = [];

        // If scopes aren't array, then discard the values and replace with empty arrays
        if (!Array.isArray(others[role])) others[role] = [];
        if (!Array.isArray(_existing[role])) _existing[role] = [];

        // If scope already exists, then ignore, otherwise insert
        others[role].forEach(scope => {
            if (!_existing[role].includes(scope)) _existing[role].push(scope);
        });
    }
    return _existing;
}
