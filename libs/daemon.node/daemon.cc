/*
* Daemon.node
*** A node.JS addon that allows creating Unix/Linux Daemons in pure Javascript.
*** Copyright 2010 (c) <arthur@norgic.com>
* Under MIT License. See LICENSE file.
*/

#include <node/node.h>
#include <v8.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <fcntl.h>

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
	
	/*sid = setsid();
	if(sid < 0) exit(1);*/
	
	// Can be changed with process.chdir
	chdir("/");
	
	return Integer::New(getpid());
}

// Close Standard IN/OUT/ERR Streams
Handle<Value> CloseIO(const Arguments& args) {
	close(STDIN_FILENO);
	close(STDOUT_FILENO);
	close(STDERR_FILENO);
}

class StreamPtr : public node::ObjectWrap
{
public:
    explicit StreamPtr(FILE** fpp);
    ~StreamPtr();

    static Handle<Value> Open(const Arguments& args);
    static Handle<Value> Close(const Arguments& args);
    static Handle<Value> Redirect(const Arguments& args);

    static void Initialize(Handle<Object> target);
    static Handle<Value> New(const Arguments& args);

private:
    static Persistent<FunctionTemplate> constructor_template;

    FILE** stream;
};

Persistent<FunctionTemplate> StreamPtr::constructor_template;

StreamPtr::StreamPtr(FILE** fpp)
    : stream(fpp)
{
}

StreamPtr::~StreamPtr()
{
    fclose(*stream);
}

Handle<Value> StreamPtr::Open(const Arguments& args)
{
    HandleScope scope;

    StreamPtr *fp = ObjectWrap::Unwrap<StreamPtr>(args.This());
    char *new_file = *String::Utf8Value(args[0]->ToString());
    *fp->stream = fopen(new_file, "w+"); //FIXME

    // return if the creation of the new FILE* was successful;
    return Boolean::New( *fp->stream != NULL );
}

Handle<Value> StreamPtr::Close(const Arguments& args)
{
    HandleScope handle_scope;

    StreamPtr *fp = ObjectWrap::Unwrap<StreamPtr>(args.This());
    assert( fp && "object had no InternalField" );
    int ret = fclose(*fp->stream);

    return Boolean::New(ret == 0);
}

Handle<Value> StreamPtr::Redirect(const Arguments& args)
{
    HandleScope scope;
    if (Close(args)->ToBoolean()->Value())
    {
        return Open(args);
    } else {
        return Boolean::New(false);
    }
}

void StreamPtr::Initialize(Handle<Object> target)
{
    HandleScope scope;

    Local<FunctionTemplate> file_pointer = FunctionTemplate::New(StreamPtr::New);
    constructor_template = Persistent<FunctionTemplate>::New(file_pointer);
    constructor_template->InstanceTemplate()->SetInternalFieldCount(1);

    NODE_SET_PROTOTYPE_METHOD(constructor_template, "open", StreamPtr::Open);
    NODE_SET_PROTOTYPE_METHOD(constructor_template, "close", StreamPtr::Close);
    NODE_SET_PROTOTYPE_METHOD(constructor_template, "sendTo", StreamPtr::Redirect);

    // Although we could expose the prototype directly, I see no reason to, as it's not
    // very useful for anything other than the intended purpose.
    //target->Set(String::NewSymbol("StreamPtr"), constructor_template->GetFunction());

    Handle<Object> stdin_obj = constructor_template->GetFunction()->NewInstance();
    Handle<External> stdin_ptr = External::New( new StreamPtr( &stdin ) );
    stdin_obj->SetInternalField(0, stdin_ptr);
    target->Set(String::NewSymbol("stdin"), stdin_obj);

    Handle<Object> stdout_obj = constructor_template->GetFunction()->NewInstance();
    Handle<External> stdout_ptr = External::New( new StreamPtr( &stdout ) );
    stdout_obj->SetInternalField(0, stdout_ptr);
    target->Set(String::NewSymbol("stdout"), stdout_obj);

    Handle<Object> stderr_obj = constructor_template->GetFunction()->NewInstance();
    Handle<External> stderr_ptr = External::New( new StreamPtr( &stderr ) );
    stderr_obj->SetInternalField(0, stderr_ptr);
    target->Set(String::NewSymbol("stderr"), stderr_obj);
}

Handle<Value> StreamPtr::New(const Arguments& args)
{
    HandleScope scope;
    return scope.Close(args.This());
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
	target->Set(String::New("closeIO"), FunctionTemplate::New(CloseIO)->GetFunction());

        StreamPtr::Initialize(target);
}
