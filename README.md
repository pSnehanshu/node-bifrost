# node-bifrost
Bifröst, Access control for node.js, as simple as that


![Bifröst](assets/thor-bifrost-asgard.jpg)

Yet another ACL library for node.js inspired by [optimalbits/node_acl](https://github.com/optimalbits/node_acl)
Bifröst is similar to `optimalbits/node_acl` except that it has a concept of [**scope**](#concept-of-scope).

## Installation

[![NPM](https://nodei.co/npm/node-bifrost.png?compact=true)](https://nodei.co/npm/node-bifrost/)

## Usage
Import the library to your project and create an instance

```javascript
const bifrost = require('node-bifrost');
```

**Note:** To create a new instance of bifrost, do this `const bifrost2 = new require('node-bifrost').constructor;`

### Define ACL
```javascript
bifrost.allow('librarian', 'books', 'create');
bifrost.allow('librarian', 'books', 'read');
bifrost.allow('librarian', 'books', 'update');
bifrost.allow('librarian', 'books', 'delete');

bifrost.allow('member', 'books', 'read');
bifrost.allow('member', 'reviews', 'create');
bifrost.allow('member', 'reviews', 'read');
bifrost.allow('member', 'reviews', 'update');
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
bifrost.assign('john', 'librarian');
bifrost.assign('rajesh', 'member');
bifrost.assign('alfred', 'librarian');
bifrost.assign('alfred', 'member');
```
### Finally, check for permission
```javascript
bifrost.allowed('john', 'books', 'create'); // true
bifrost.allowed('john', 'reviews', 'update'); // false

bifrost.allowed('rajesh', 'books', 'delete'); // false
bifrost.allowed('rajesh', 'reviews', 'read'); // true

bifrost.allowed('alfred', 'books', 'update'); // true
bifrost.allowed('alfred', 'reviews', 'create'); // true
bifrost.allowed('alfred', 'issues', 'create'); // false
```

**Note:** Every action on every resource is denied to every user unless explicitly allowed.

## Concept of scope

In some applications, especially SaaS, there is a need to implement a [multi-tenancy architecture](https://whatis.techtarget.com/definition/multi-tenancy). In those apps, a user should not be able access resources belonging to other tenants.

For example, assume we have a library management system as a SaaS offering. There will be multiple libraries, and every library will have its own set of users, even though the roles are same across schools (i.e. Librarian, Accountant, Member etc.). We wouldn't want, for example, the librarian of Library A to have librarian privileges at Library B.

Here comes in **Scope**. When assigning role using `bifrost.assign`, you can pass a third argument called `scope`. e.g.

```javascript
bifrost.assign('john', 'librarian', 'library-a');
```

Now, `john` is declared as a `librarian` of only the `library-a` scope. When checking for permission using `bifrost.allowed`, you can pass a fourth argument called `scope`. e.g.

```javascript
bifrost.allowed('john', 'books', 'create', 'library-a'); // true
bifrost.allowed('john', 'books', 'create', 'library-b'); // false
```
