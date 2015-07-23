Numbers = new Mongo.Collection("numbers");

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("numbers");

  Template.body.helpers({
    numbers: function () {
      var filter = Session.get("hideCompleted") ? {checked: {$ne: true}} : {};
      return Numbers.find(filter, {sort: {createdAt: -1}});
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Numbers.find({checked: {$ne: true}}).count();
    },
  });

  Template.body.events({
    "submit .new-number": function (event) {
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get value from form element
      var number = event.target.number.value;
 
      // Insert a task into the collection
      Meteor.call("addNumber", number);
 
      // Clear form
      event.target.number.value = "";
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });
  Template.number.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteNumber", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    },
  });
  Template.number.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addNumber: function (number) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
 
    Numbers.insert({
      number: number,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteNumber: function (numberId) {
    var number = Numbers.findOne(numberId);
    if (number.private && number.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }
    
    Numbers.remove(numberId);
  },
  setChecked: function (numberId, setChecked) {
    var number = Numbers.findOne(numberId);
    if (number.private && number.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }
 
    Numbers.update(numberId, { $set: { checked: setChecked} });
  },
  setPrivate: function (numberId, setToPrivate) {
    var number = Numbers.findOne(numberId);
 
    // Make sure only the task owner can make a task private
    if (number.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
 
    Numbers.update(numberId, { $set: { private: setToPrivate } });
  }
});

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish numbers that are public or belong to the current user
  Meteor.publish("numbers", function () {
    return Numbers.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}
