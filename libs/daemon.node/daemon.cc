/*
* Daemon.node
*** A node.JS addon that allows creating Unix/Linux Daemons in pure Javascript.
*** Copyright 2010 (c) <arthur@norgic.com>
* Under MIT License. See LICENSE file.
*/

#include <v8.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdio.h>

#define PID_MAXLEN 10

using namespace v8;

// Go through special routines to become a daemon.
// if successful, returns daemon's PID
Handle<Value> Start(const Arguments& args) {
	pid_t pid, sid;
	
	pid = fork();
	if(pid > 0) exit(0);
	if(pid < 0) exit(1);
	
	// Can be changed after with process.umaks
	umask(0);
	
/*	sid = setsid();
	if(sid < 0) exit(1); */
	
	// Can be changed with process.chdir
	chdir("/");
	
	return Integer::New(getpid());
}

// Close Standard IN/OUT/ERR Streams
Handle<Value> CloseStdin(const Arguments& args) {
	fclose(stdin);
	stdin = fopen("/dev/null", "r");
}

Handle<Value> RedirectOut(const Arguments& args) {
    FILE* new_stdout = fopen(*String::Utf8Value(args[0]->ToString()), "w");
    fclose(stdout);
    stdout = new_stdout;
    
    FILE* new_stderr = fopen(*String::Utf8Value(args[0]->ToString()), "w");
    fclose(stderr);
    stderr = new_stderr;
}

// File-lock to make sure that only one instance of daemon is running.. also for storing PID
/* lock ( filename )
*** filename: a path to a lock-file.
*** Note: if filename doesn't exist, it will be created when function is called.
*/
Handle<Value> LockD(const Arguments& args) {
	if(!args[0]->IsString())
		return Boolean::New(false);
	
	String::Utf8Value data(args[0]->ToString());
	char pid_str[PID_MAXLEN+1];
	
	int lfp = open(*data, O_RDWR | O_CREAT, 0640);
	if(lfp < 0) exit(1);
	if(lockf(lfp, F_TLOCK, 0) < 0) exit(0);
	
	int len = snprintf(pid_str, PID_MAXLEN, "%d", getpid());
	write(lfp, pid_str, len);
	
	return Boolean::New(true);
}

extern "C" void init(Handle<Object> target) {
	HandleScope scope;
	
	target->Set(String::New("start"), FunctionTemplate::New(Start)->GetFunction());
	target->Set(String::New("lock"), FunctionTemplate::New(LockD)->GetFunction());
	target->Set(String::New("closeStdin"), FunctionTemplate::New(CloseStdin)->GetFunction());
	target->Set(String::New("redirectOut"), FunctionTemplate::New(RedirectOut)->GetFunction());
}
