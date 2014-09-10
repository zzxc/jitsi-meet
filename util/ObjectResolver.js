function ObjectResolver(dep)
{
    if(!dep)
    {
        this.creators = {};
        this.objects = {};
    }
    else
    {
        for(var key in dep)
        {
            this.creators[key] = dep[key];
            this.objects[key] = null;
        }
    }
}

ObjectResolver.prototype.import = function(key, creator)
{
    if(this.creators[key])
        throw "The key is already used";
    this.objects[key] = null;
}

ObjectResolver.prototype.get = function(key)
{
    if(this.objects[key] == null)
        this.objects[key] = this.creators[key]();
    return this.objects[key];
}

module.exports = ObjectResolver;