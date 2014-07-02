"use strict";


module.exports = function () {
    function getRole(charId, array) {
        var roleId;
        if (!array) {
            return null;
        }
        for (roleId in array) {
            if (array.hasOwnProperty(roleId) && array[roleId][charId]) {
                return roleId;
            }
        }
        return null;
    }

    function getRoles(charId, array) {
        var roleId,
            roleIds = [];

        if (!array) {
            return roleIds;
        }
        for (roleId in array) {
            if (array.hasOwnProperty(roleId) && array[roleId][charId]) {
                roleIds.push(roleId);
            }
        }
        return roleIds;
    }

    function isSignedUp(charId, raid) {
        return getRole(charId, raid.signedUp) !== null;
    }

    function isAffirmed(charId, raid) {
        return getRole(charId, raid.affirmed) !== null;
    }

    function isSignedUpAs(charId, raid, roleId) {
        return raid.hasOwnProperty("signedUp") && raid.signedUp.hasOwnProperty(roleId) && raid.signedUp[roleId].hasOwnProperty(charId);
    }

    function isAffirmedAs(charId, raid, roleId) {
        return raid.hasOwnProperty("affirmed") && raid.affirmed.hasOwnProperty(roleId) && raid.affirmed[roleId].hasOwnProperty(charId);
    }

    return {
        getRole:      getRole,
        getRoles:     getRoles,
        isSignedUp:   isSignedUp,
        isAffirmed:   isAffirmed,
        isSignedUpAs: isSignedUpAs,
        isAffirmedAs: isAffirmedAs
    };
};