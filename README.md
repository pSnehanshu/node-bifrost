# node-bifrost
Bifröst, Access control for node.js, as simple as that.

**Note:** Works with MongoDB only (more databases coming, you're welcome to contribute)

![Bifröst](assets/thor-bifrost-asgard.jpg)

Yet another ACL library for node.js inspired by [optimalbits/node_acl](https://github.com/optimalbits/node_acl) except that bifrost has the concept of [scope](#concept-of-scope).

## Installation

[![NPM](https://nodei.co/npm/node-bifrost.png?compact=true)](https://nodei.co/npm/node-bifrost/)

## Usage
Import the library to your project and create an instance

```javascript
const Bifrost = require('node-bifrost');
const bifrost = new Bifrost('mongodb://localhost:27017/mydb', {
    cb() {
        // rest of the database dependent code goes here
    },
    err_cb(err) {
        // In case error occurs
    },
});
```

### Define ACL
```javascript
bifrost.allow('librarian', 'books', 'create');
bifrost.allow('librarian', 'books', 'read');
bifrost.allow('librarian', 'books', 'update');
bifrost.allow('librarian', 'books', 'delete');
// ------------- OR -------------------------
bifrost.allow('librarian', 'books', ['create', 'read', 'update', 'delete']);


bifrost.allow('member', 'books', 'read');
bifrost.allow('member', 'reviews', ['create', 'read', 'update']);
```
Here we allowed the `librarian` role to `create`, `read`, `update` and `delete` the `books` resource.

We allowed the `member` role to just `read` the `books` and `create`, `read` and `update` the `reviews` resource.

The roles and resources are created implicitly, i.e. they are automatically created if they don't exist.

### Assign roles to users
Assume that we have three users, `john`, `rajesh` and `alfred`.
1. `john` is a `librarian`
2. `rajesh` is a `member`
3. `alfred` is both a `librarian` and a `member`

We can implement this as follows:

```javascript
await bifrost.assign('john', 'librarian');
await bifrost.assign('rajesh', 'member');
await bifrost.assign('alfred', 'librarian');
await bifrost.assign('alfred', 'member');

// We're using `await` keyword because `bifrost.assign` returns a Promise.
// Don't forget to wrap this code inside an async function
```

### Finally, check for permission
```javascript
await bifrost.allowed('john', 'books', 'create'); // true
await bifrost.allowed('john', 'reviews', 'update'); // false

await bifrost.allowed('rajesh', 'books', 'delete'); // false
await bifrost.allowed('rajesh', 'reviews', 'read'); // true

await bifrost.allowed('alfred', 'books', 'update'); // true
await bifrost.allowed('alfred', 'reviews', 'create'); // true
await bifrost.allowed('alfred', 'issues', 'create'); // false

// We're using `await` keyword because `bifrost.allowed` returns a Promise.
// Don't forget to wrap this code inside an async function
```

**Note:** Every action on every resource is denied to every user unless explicitly allowed.

### Wildcard support
You can use `*` to give wildcard permission. for example,
```javascript
bifrost.allow('accountant', 'fees', '*'); // Gives accountant the permission to all actions for fees resource.
bifrost.allow('vice-principal', '*', 'update'); // Gives vice-principal the delete permission for all resources
bifrost.allow('principal', '*', '*'); // Gives principal all permissions for all resources.
```

## Concept of scope

In some applications, especially SaaS, there is a need to implement a [multi-tenancy architecture](https://whatis.techtarget.com/definition/multi-tenancy). In those apps, a user should not be able access resources belonging to other tenants.

For example, assume we have a library management system as a SaaS offering. There will be multiple libraries, and every library will have its own set of users, even though the roles are same across schools (i.e. Librarian, Accountant, Member etc.). We wouldn't want, for example, the librarian of Library A to have librarian privileges at Library B.

Here comes in **Scope**. When assigning role using `bifrost.assign`, you can pass a third argument called `scope`. e.g.

```javascript
bifrost.assign('john', 'librarian', 'library-a');
```

Now, `john` is declared as a `librarian` of only the `library-a` scope. When checking for permission using `bifrost.allowed`, you can pass a fourth argument called `scope`. e.g.

```javascript
await bifrost.allowed('john', 'books', 'create', 'library-a'); // true
await bifrost.allowed('john', 'books', 'create', 'library-b'); // false

// We're using `await` keyword because `bifrost.allowed` returns a Promise.
// Don't forget to wrap this code inside an async function
```

### Scope hierarchy
Sometimes there is a need to implement hierarchy for scopes. For example, lets say there are several kingdoms under an empire. Then the emperor of the empire should have access over the kindgoms but not the other way around i.e. the kings of the kingdoms shouldn't have power over the empire.

```javascript
bifrost.allow('emperor', '*', '*'); // Emperor can do everything
bifrost.allow('king', 'subjects', '*'); // Kings can do everything to his subjects

await bifrost.assign('aurangzeb', 'emperor', 'mughal-empire'); // aurangzeb has been assigned as the emperor of the Mughal Empire
await bifrost.assign('shivaji', 'king', 'maratha-kingdom'); // shivaji has been assigned as the king of the Maratha Kingdom
await bifrost.assign('godapani', 'king', 'ahom-kingdom'); // godapani has been assigned as the king of the Ahom Kingdom

// Assign the mughal kingdom as the parent scope of the maratha kingdom
bifrost.addParentScope('maratha-kingdom', 'mughal-empire');

// Aurangzeb is allowed to perfrom the action on maratha kingdom because its a child scope of mughal empire
await bifrost.allowed('aurangzeb', 'finance', 'update', 'maratha-kingdom'); // true

// Aurangzeb isn't allowed to perfrom the action on ahom kingdom because its not a child scope of mughal empire
await bifrost.allowed('aurangzeb', 'finance', 'update', 'ahom-kingdom'); // false
```
