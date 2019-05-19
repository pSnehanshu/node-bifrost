module.exports = Bifrost;

function Bifrost() {
    /* The structure of the ACList
    {
        role: {
            scope: {
                resource: [action]
            }
        }
    }
    */
    this.aclist = {};

    this.isAllowed = isAllowed;
    this.allow = allow;
}

/**
 * Checks if allowed. Note: Every action is forbidden unless allowed.
 * @param {String} role 
 * @param {String} resource 
 * @param {String} action 
 * @param {String} scope 
 * @returns {Boolean}
 */
function isAllowed(user, resource, action, scope = '__global') {
    try {
        var actions = this.aclist[role][scope][resource];
        return actions.includes(action);
    } catch (error) {
        return false;
    }

}

/**
 * Creates allow permissions. Note: Every action is forbidden unless allowed.
 * @param {String} role 
 * @param {String} resource 
 * @param {String} action 
 * @param {String} scope 
 */
function allow(role, resource, action, scope = '__global') {
    // Create role if not exists
    if (!this.aclist[role]) this.aclist[role] = {};
    var _role = this.aclist[role];

    // Create scope if not exists
    if (!_role[scope]) _role[scope] = {};
    var _scope = _role[scope];

    // Create resource if not exists
    if (!_scope[resource]) _scope[resource] = [];
    var _resource = _scope[resource];

    // Insert action if not exists
    if (!_resource.includes(action)) _resource.push(action);
}
