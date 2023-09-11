# Contribute to Gallery of Glosses Data Entry

## ❤️ Thank You
Thank you for considering a contribution!  The `main` branch is protected and you cannot push to it.  Please make a new branch, and when you are a finished open a pull request targeting the `main` branch.  The pull request will be reviewed and we will get back to you.

## Ready to Install It And Run It!

***RUN THE APP IN A WEB SERVER CONTAINER***

If you want to contribute, it is imortant you are able to deploy the code and run locally.  To do so, it is best you use some kind of web server such as a [Docker Container](https://docs.docker.com/get-started/) or [Tomcat Web Server](https://tomcat.apache.org/).  You can use any web server container you prefer.  

You want a web server because a core functionality of the Gallery of Glosses application is to ask the internet for resources by their URI, like https://store.rerum.io/v1/id/11111.  Running this application through your filesystem as opposed to a web server will cause errors when trying to pull in resources from the web.  Feel free to try.

Make sure Git is installed on your machine.  For download and installation instruction, [head to the Git guide](https://git-scm.com/downloads).  Note this can also be achieved by installing [GitHub for Desktop](https://desktop.github.com/).  

The following is a git shell example for installing the app on your local machine.

```
cd /web_container/
git clone https://github.com/CenterForDigitalHumanities/glossing-entries.git glossing
```

That's all you need!  Now start up your web server.  If you used the example above access the app at http://localhost/glossing.  

## 🎉 Ready to Start Contributing!

Awesome!  Make a new branch through the GitHub Interface or through your shell.  Make sure you 'checkout' that branch.

```
cd /web_container/glossing
git checkout my_new_branch
```

Now you can make code changes and see them in real time.  When you are finished with the commits to your new branch, open a Pull Request that targets the `main` branch at [https://github.com/CenterForDigitalHumanities/glossing-entries/tree/main/](https://github.com/CenterForDigitalHumanities/deer/tree/main/).